import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { INVOPAY_CONTRACT_ADDRESS } from "@/lib/constants";
import { INVOPAY_ABI } from "@/lib/contract-abi";
import { getInvoice, calculateGasCost, generateInvoiceId } from "@backend/lib/services/contract.service";
import { calculateFee, getCreateInvoiceArgs } from "@backend/lib/services/invoice.service";
import { createInvoice as createInvoiceInDb } from "@backend/lib/services/invoice-db.service";
import type { InvoiceFormData } from "./useInvoiceForm";

export function useCreateInvoice() {
  const { address } = useAccount();
  const router = useRouter();
  const [isCreatingOnChain, setIsCreatingOnChain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbSaveError, setDbSaveError] = useState<{ invoiceData: any; receipt: any } | null>(null);

  const {
    writeContract: writeCreateInvoice,
    data: createTxHash,
    error: writeError,
    isError: isWriteError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isWaitingForTx,
    data: receipt,
    error: receiptError,
    isError: isReceiptError,
  } = useWaitForTransactionReceipt({
    hash: createTxHash,
  });

  const saveInvoiceToDatabase = async (invoiceData: any, receipt: any) => {
    try {
      let onChainInvoice;
      try {
        onChainInvoice = await getInvoice(invoiceData.id);
        const creator = (onChainInvoice as any)?.creator;
        if (
          !onChainInvoice ||
          !creator ||
          creator === "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error("Invoice does not exist on-chain.");
        }
      } catch (readError: any) {
        setIsCreatingOnChain(false);
        delete (window as any).__pendingInvoiceData;
        setError(
          `Invoice was NOT created on-chain. Transaction ${receipt.transactionHash} may be for fee approval only. Please check the block explorer.`
        );
        return;
      }

      const gasCost = calculateGasCost(receipt);

      let result;
      try {
        result = await createInvoiceInDb({
          ...invoiceData,
          transaction_hash: receipt.transactionHash,
          gas_cost: gasCost,
          gas_cost_creation: gasCost,
        });
      } catch (dbError: any) {
        throw dbError;
      }

      if (result.error) {
        throw result.error;
      }

      if (result.isDuplicate) {
        delete (window as any).__pendingInvoiceData;
        setDbSaveError(null);
        setIsCreatingOnChain(false);
        router.push(invoiceData.payment_link);
        return;
      }

      delete (window as any).__pendingInvoiceData;
      setDbSaveError(null);
      setIsCreatingOnChain(false);
      router.push(invoiceData.payment_link);
    } catch (error: any) {
      setIsCreatingOnChain(false);
      setDbSaveError({ invoiceData, receipt });
      const errorMessage = error?.message || error?.code || "Unknown database error";
      setError(
        `Database save failed: ${errorMessage}. The invoice is registered on-chain. You can retry saving to database.`
      );
    }
  };

  const createInvoice = async (
    data: InvoiceFormData,
    needsApproval: boolean,
    feeAmountInWei: bigint | undefined,
    balance: bigint | undefined
  ) => {
    if (!address || !INVOPAY_CONTRACT_ADDRESS) {
      alert("Contract address not configured. Please deploy the contract first.");
      return;
    }

    if (needsApproval) {
      setError("Please approve the contract to spend tokens for the fee first.");
      return;
    }

    if (feeAmountInWei && balance !== undefined && typeof balance === "bigint") {
      if (balance < feeAmountInWei) {
        const feeAmount = formatUnits(feeAmountInWei, 6);
        setError(
          `Insufficient balance. You need at least ${feeAmount} ${data.currency} to pay the fee (0.05% of invoice amount).`
        );
        return;
      }
    } else if (feeAmountInWei && (balance === undefined || balance === null)) {
      setError("Unable to check your balance. Please try again.");
      return;
    }

    try {
      const invoiceId = generateInvoiceId();
      const paymentLink = `/pay/${invoiceId}`;
      const feeAmount = calculateFee(data.amount);

      const invoiceData = {
        id: invoiceId,
        user_wallet_address: address.toLowerCase(),
        receiver_wallet_address: data.receiver_wallet_address.toLowerCase(),
        amount: data.amount,
        currency: data.currency,
        status: "pending" as const,
        payment_link: paymentLink,
        description: data.description,
        fee_amount: feeAmount,
      };

      setIsCreatingOnChain(true);
      setError(null);

      try {
        (window as any).__pendingInvoiceData = invoiceData;

        if (typeof writeCreateInvoice !== "function") {
          throw new Error(
            "writeCreateInvoice is not available. Please check your wallet connection."
          );
        }

        const contractArgs = getCreateInvoiceArgs({
          invoiceId,
          receiver: data.receiver_wallet_address as `0x${string}`,
          amount: data.amount,
          currency: data.currency,
          expiresAt: 0,
          paymentLink,
          description: data.description,
        }) as unknown as {
          address: `0x${string}`;
          abi: typeof INVOPAY_ABI;
          functionName: "createInvoice";
          args: readonly [`0x${string}`, `0x${string}`, bigint, `0x${string}`, bigint, string, string];
        };

        writeCreateInvoice(contractArgs);
      } catch (error: any) {
        setIsCreatingOnChain(false);
        delete (window as any).__pendingInvoiceData;
        setError(
          `Failed to initiate transaction: ${error?.message || "Unknown error"}. Please try again.`
        );
      }
    } catch (error: any) {
      setIsCreatingOnChain(false);
      delete (window as any).__pendingInvoiceData;
      setError(`Failed to create invoice: ${error?.message || "Unknown error"}. Please try again.`);
    }
  };

  const retryDatabaseSave = async () => {
    if (dbSaveError) {
      setError(null);
      setIsCreatingOnChain(true);
      await saveInvoiceToDatabase(dbSaveError.invoiceData, dbSaveError.receipt);
    }
  };

  useEffect(() => {
    if (createTxHash) {
      setError(null);
      if (!(window as any).__pendingInvoiceData) {
        setError("Invoice data not found. Please try creating the invoice again.");
        setIsCreatingOnChain(false);
      }
    }
  }, [createTxHash]);

  useEffect(() => {
    if (isWriteError && writeError) {
      setIsCreatingOnChain(false);
      delete (window as any).__pendingInvoiceData;
      setError(
        `Failed to send createInvoice transaction: ${writeError.message || "Unknown error"}. Please check your wallet and try again.`
      );
    }
  }, [isWriteError, writeError]);

  useEffect(() => {
    if (isReceiptError && receiptError) {
      setIsCreatingOnChain(false);
      delete (window as any).__pendingInvoiceData;
      setError(
        `Transaction failed: ${receiptError.message || "Unknown error"}. The invoice was NOT created on-chain.`
      );
    }
  }, [isReceiptError, receiptError]);

  useEffect(() => {
    if (receipt && isCreatingOnChain && createTxHash) {
      if (receipt.status === "reverted") {
        setIsCreatingOnChain(false);
        delete (window as any).__pendingInvoiceData;
        setError("Transaction failed on-chain. The invoice was not created. No fee was charged.");
        return;
      }

      if (!receipt.to || receipt.to?.toLowerCase() !== INVOPAY_CONTRACT_ADDRESS?.toLowerCase()) {
        setIsCreatingOnChain(false);
        delete (window as any).__pendingInvoiceData;
        setError(
          "Transaction is not a createInvoice call. This appears to be a token approval transaction. The invoice was NOT created on-chain. Please approve the token first, then create the invoice."
        );
        return;
      }

      if (receipt.transactionHash.toLowerCase() !== createTxHash.toLowerCase()) {
        setIsCreatingOnChain(false);
        delete (window as any).__pendingInvoiceData;
        setError("Transaction hash mismatch. This may not be the createInvoice transaction.");
        return;
      }

      const invoiceData = (window as any).__pendingInvoiceData;
      if (invoiceData) {
        const verifyAndSave = async () => {
          const maxRetries = 8;
          const retryDelay = 3000;

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              if (attempt > 0) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              }

              const onChainInvoice = await getInvoice(invoiceData.id);
              
              if (onChainInvoice && Array.isArray(onChainInvoice) && onChainInvoice.length > 0) {
                const creator = onChainInvoice[0] || (onChainInvoice as any)?.creator;
                if (creator && creator !== "0x0000000000000000000000000000000000000000") {
                  saveInvoiceToDatabase(invoiceData, receipt);
                  return;
                }
              } else if (onChainInvoice && typeof onChainInvoice === "object") {
                const creator = (onChainInvoice as any)?.creator;
                if (creator && creator !== "0x0000000000000000000000000000000000000000") {
                  saveInvoiceToDatabase(invoiceData, receipt);
                  return;
                }
              }

              if (attempt === maxRetries - 1) {
                if (receipt.status === "success") {
                  saveInvoiceToDatabase(invoiceData, receipt);
                  return;
                }
                setIsCreatingOnChain(false);
                delete (window as any).__pendingInvoiceData;
                setError(
                  "Invoice verification failed. If the transaction was successful, the invoice may still be saved. Please check the block explorer."
                );
                return;
              }
            } catch (readError: any) {
              if (attempt === maxRetries - 1) {
                if (receipt.status === "success") {
                  saveInvoiceToDatabase(invoiceData, receipt);
                  return;
                }
                setIsCreatingOnChain(false);
                delete (window as any).__pendingInvoiceData;
                setError(
                  `Could not verify invoice on-chain. Transaction: ${receipt.transactionHash.substring(0, 10)}... If successful, invoice may still be saved.`
                );
                return;
              }
            }
          }
        };

        verifyAndSave();
      }
    }
  }, [receipt, isCreatingOnChain, createTxHash]);

  return {
    createInvoice,
    isCreatingOnChain,
    isWaitingForTx,
    error,
    dbSaveError,
    retryDatabaseSave,
    createTxHash,
    resetWrite,
  };
}
