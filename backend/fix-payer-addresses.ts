/**
 * Script to fix payer_address in database by querying InvoicePaid events from blockchain
 *
 * This script:
 * 1. Finds all paid invoices where payer_address is null or equals user_wallet_address
 * 2. Queries the blockchain for InvoicePaid events
 * 3. Updates the database with the correct payer_address
 *
 * Run with: npx ts-node scripts/fix-payer-addresses.ts
 */

import { createClient } from "@supabase/supabase-js";
import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { arcTestnet } from "viem/chains";
import * as dotenv from "dotenv";
import { keccak256, toHex } from "viem";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PAYZED_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYZED_CONTRACT_ADDRESS!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

async function fixPayerAddresses() {
  console.log("🔍 Finding invoices with incorrect payer_address...");

  // Find all paid invoices where payer_address is null or equals user_wallet_address
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("status", "paid")
    .or("payer_address.is.null,payer_address.eq.user_wallet_address");

  if (error) {
    console.error("❌ Error fetching invoices:", error);
    return;
  }

  if (!invoices || invoices.length === 0) {
    console.log("✅ No invoices need fixing!");
    return;
  }

  console.log(`📋 Found ${invoices.length} invoices to fix`);

  const invoicePaidEventAbi = parseAbiItem(
    "event InvoicePaid(bytes32 indexed invoiceId, address indexed payer, bytes32 indexed transactionHash)"
  );

  let fixed = 0;
  let failed = 0;

  for (const invoice of invoices) {
    try {
      // Convert invoice ID to bytes32
      const invoiceIdBytes32 = keccak256(toHex(invoice.id));

      // Get transaction hash
      if (!invoice.transaction_hash) {
        console.log(`⚠️  Invoice ${invoice.id} has no transaction_hash, skipping...`);
        failed++;
        continue;
      }

      // Get receipt
      const receipt = await publicClient.getTransactionReceipt({
        hash: invoice.transaction_hash as `0x${string}`,
      });

      if (!receipt || !receipt.logs) {
        console.log(`⚠️  Could not get receipt for ${invoice.id}, skipping...`);
        failed++;
        continue;
      }

      // Find InvoicePaid event
      let payerAddress: string | null = null;

      for (const log of receipt.logs) {
        if (log.address?.toLowerCase() !== PAYZED_CONTRACT_ADDRESS.toLowerCase()) {
          continue;
        }

        try {
          const decoded = decodeEventLog({
            abi: [invoicePaidEventAbi],
            data: log.data,
            topics: log.topics,
          });

          if (decoded.args.invoiceId?.toLowerCase() === invoiceIdBytes32.toLowerCase()) {
            payerAddress = String(decoded.args.payer).toLowerCase();
            break;
          }
        } catch (error) {
          // Not an InvoicePaid event, continue
          continue;
        }
      }

      if (!payerAddress) {
        console.log(`⚠️  Could not find InvoicePaid event for ${invoice.id}, skipping...`);
        failed++;
        continue;
      }

      // Verify payer is different from creator
      if (payerAddress === invoice.user_wallet_address.toLowerCase()) {
        console.log(
          `⚠️  Payer equals creator for ${invoice.id}, this might be a self-payment, skipping...`
        );
        failed++;
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          payer_address: payerAddress,
        })
        .eq("id", invoice.id);

      if (updateError) {
        console.error(`❌ Error updating invoice ${invoice.id}:`, updateError);
        failed++;
      } else {
        console.log(`✅ Fixed invoice ${invoice.id}: payer_address = ${payerAddress}`);
        fixed++;
      }
    } catch (error: any) {
      console.error(`❌ Error processing invoice ${invoice.id}:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📋 Total: ${invoices.length}`);
}

// Run the fix
fixPayerAddresses()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
