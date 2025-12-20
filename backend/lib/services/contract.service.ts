import { Address, keccak256, toHex } from "viem";
import { PAYZED_CONTRACT_ADDRESS } from "@/lib/constants";
import { PAYZED_ABI } from "@/lib/contract-abi";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/wagmi";

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

export function generateInvoiceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function uuidToBytes32(uuid: string): `0x${string}` {
  return keccak256(toHex(uuid));
}

export function calculateGasCost(receipt: any): number | undefined {
  if (!receipt?.gasUsed || !receipt?.effectiveGasPrice) return undefined;

  const gasUsedBigInt = BigInt(receipt.gasUsed.toString());
  const gasPriceBigInt = BigInt(receipt.effectiveGasPrice.toString());
  const totalWei = gasUsedBigInt * gasPriceBigInt;

  const divisor = BigInt(1e18);
  const quotient = totalWei / divisor;
  const remainder = totalWei % divisor;

  const decimalPart = Number(remainder) / 1e18;
  const nativeTokenAmount = Number(quotient) + decimalPart;

  return nativeTokenAmount > 1 ? undefined : nativeTokenAmount;
}

export async function getInvoice(invoiceId: string) {
  if (!PAYZED_CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }

  const invoiceIdBytes32 = uuidToBytes32(invoiceId);

  return await publicClient.readContract({
    address: PAYZED_CONTRACT_ADDRESS as Address,
    abi: PAYZED_ABI,
    functionName: "getInvoice",
    args: [invoiceIdBytes32],
  });
}

export async function getAccumulatedFees(tokenAddress: Address) {
  if (!PAYZED_CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }

  return await publicClient.readContract({
    address: PAYZED_CONTRACT_ADDRESS as Address,
    abi: PAYZED_ABI,
    functionName: "getAccumulatedFees",
    args: [tokenAddress],
  });
}

export async function getOwner() {
  if (!PAYZED_CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }

  return await publicClient.readContract({
    address: PAYZED_CONTRACT_ADDRESS as Address,
    abi: PAYZED_ABI,
    functionName: "owner",
  });
}

export async function getTransactionReceipt(hash: `0x${string}`) {
  return await publicClient.getTransactionReceipt({ hash });
}

export function getContractAddress(): string {
  if (!PAYZED_CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }
  return PAYZED_CONTRACT_ADDRESS;
}
