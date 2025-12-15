import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { formatUnits, decodeEventLog } from "viem";
import { INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS } from "@/lib/constants";
import { INVOPAY_SUBSCRIPTION_ABI } from "@/lib/subscription-contract-abi";
import { calculateGasCost } from "@backend/lib/services/contract.service";
import { calculateCreationFee, getCreateSubscriptionArgs } from "@backend/lib/services/subscription.service";
import { getSubscriptionByBytes32 } from "@backend/lib/services/contract.service";
import { createSubscription as createSubscriptionInDb } from "@backend/lib/services/subscription-db.service";
import type { SubscriptionFormData } from "./useSubscriptionForm";

export function useCreateSubscription() {
  const { address } = useAccount();
  const router = useRouter();
  const publicClient = usePublicClient();
  const [isCreatingOnChain, setIsCreatingOnChain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbSaveError, setDbSaveError] = useState<{ subscriptionData: any; receipt: any; subscriptionIdBytes32?: string } | null>(null);

  const {
    writeContract: writeCreateSubscription,
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

  const saveSubscriptionToDatabase = async (subscriptionData: any, receipt: any, subscriptionIdBytes32: string) => {
    try {
      console.log("[saveSubscriptionToDatabase] Verifying subscription exists on-chain...", {
        subscriptionIdBytes32,
        transactionHash: receipt.transactionHash,
      });

      let onChainSubscription;
      try {
        const subscriptionIdHex = subscriptionIdBytes32.startsWith("0x") 
          ? subscriptionIdBytes32 as `0x${string}`
          : `0x${subscriptionIdBytes32}` as `0x${string}`;
        onChainSubscription = await getSubscriptionByBytes32(subscriptionIdHex);
        const creator = (onChainSubscription as any)?.creator;
        console.log("[saveSubscriptionToDatabase] On-chain subscription found:", {
          exists: !!onChainSubscription,
          creator,
        });
        if (
          !onChainSubscription ||
          !creator ||
          creator === "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error("Subscription does not exist on-chain.");
        }
      } catch (readError: any) {
        console.error("[saveSubscriptionToDatabase] Subscription not found on-chain:", readError);
        setIsCreatingOnChain(false);
        delete (window as any).__pendingSubscriptionData;
        setError(
          `Subscription was NOT created on-chain. Transaction ${receipt.transactionHash} may be for fee approval only. Please check the block explorer.`
        );
        return;
      }

      const gasCost = calculateGasCost(receipt);

      let result;
      try {
        result = await createSubscriptionInDb({
          ...subscriptionData,
          subscription_id_bytes32: subscriptionIdBytes32,
        });
      } catch (dbError: any) {
        // Check if it's a schema cache error
        const isSchemaCacheError = 
          dbError?.message?.includes("schema cache") ||
          dbError?.message?.includes("Could not find the table") ||
          dbError?.code === "PGRST301" ||
          dbError?.code === "PGRST116";

        if (isSchemaCacheError) {
          // The service already retried, but if it still failed, provide helpful message
          // The error message from backend will already include specific instructions
          throw dbError;
        }
        throw dbError;
      }

      if (result.error) {
        throw result.error;
      }

      if (result.isDuplicate) {
        delete (window as any).__pendingSubscriptionData;
        setDbSaveError(null);
        setIsCreatingOnChain(false);
        // If duplicate, try to find existing subscription and redirect to it
        if (result.data?.id) {
          router.push(`/subscription/${result.data.id}`);
        } else {
          router.push("/dashboard");
        }
        return;
      }

      if (!result.data?.id) {
        delete (window as any).__pendingSubscriptionData;
        setDbSaveError(null);
        setIsCreatingOnChain(false);
        router.push("/dashboard");
        return;
      }

      delete (window as any).__pendingSubscriptionData;
      setDbSaveError(null);
      setIsCreatingOnChain(false);
      router.push(`/subscription/${result.data.id}`);
    } catch (error: any) {
      setIsCreatingOnChain(false);
      setDbSaveError({ subscriptionData, receipt, subscriptionIdBytes32 });
      const errorMessage = error?.message || error?.code || "Unknown database error";
      setError(
        `Database save failed: ${errorMessage}. The subscription is registered on-chain. You can retry saving to database.`
      );
    }
  };

  const extractSubscriptionIdFromReceipt = (receipt: any): string | null => {
    try {
      if (!receipt?.logs) return null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: INVOPAY_SUBSCRIPTION_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "SubscriptionCreated" && decoded.args?.subscriptionId) {
            const subscriptionIdBytes32 = decoded.args.subscriptionId as `0x${string}`;
            return subscriptionIdBytes32;
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const createSubscription = async (
    data: SubscriptionFormData,
    needsApproval: boolean,
    feeAmountInWei: bigint | undefined,
    balance: bigint | undefined
  ) => {
    if (!address || !INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS) {
      alert("Subscription contract address not configured. Please deploy the contract first.");
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
          `Insufficient balance. You need at least ${feeAmount} ${data.currency} to pay the creation fee (0.05% of subscription amount).`
        );
        return;
      }
    } else if (feeAmountInWei && (balance === undefined || balance === null)) {
      setError("Unable to check your balance. Please try again.");
      return;
    }

    try {
      setError(null);
      setIsCreatingOnChain(true);

      const periodInSeconds = BigInt(data.period_days) * BigInt(86400);

      // Pass address(0) as payer - will be set on first payment
      const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

      const createArgs = getCreateSubscriptionArgs({
        receiver: data.receiver_wallet_address as `0x${string}`,
        payer: zeroAddress,
        amount: data.amount,
        currency: data.currency,
        period: Number(periodInSeconds),
        description: data.description,
      }) as unknown as {
        address: `0x${string}`;
        abi: typeof INVOPAY_SUBSCRIPTION_ABI;
        functionName: "createSubscription";
        args: readonly [`0x${string}`, `0x${string}`, bigint, `0x${string}`, bigint, string];
      };

      const subscriptionData = {
        creator_wallet_address: address.toLowerCase(),
        payer_wallet_address: zeroAddress.toLowerCase(), // Will be updated on first payment
        receiver_wallet_address: data.receiver_wallet_address.toLowerCase(),
        amount: data.amount,
        currency: data.currency,
        period_seconds: Number(periodInSeconds),
        next_payment_due: new Date(Date.now() + Number(periodInSeconds) * 1000).toISOString(), // Will be recalculated on first payment
        description: data.description,
        status: "pending" as const, // Start as pending, becomes active after first payment
      };

      (window as any).__pendingSubscriptionData = subscriptionData;

      console.log("[createSubscription] Sending transaction with args:", {
        address: createArgs.address,
        functionName: createArgs.functionName,
        args: createArgs.args,
      });

      writeCreateSubscription(createArgs as any);
    } catch (error: any) {
      setIsCreatingOnChain(false);
      delete (window as any).__pendingSubscriptionData;
      const errorMessage = error?.message || "Unknown error occurred";
      console.error("[createSubscription] Error:", error);
      setError(`Failed to create subscription: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (writeError || isWriteError) {
      setIsCreatingOnChain(false);
      delete (window as any).__pendingSubscriptionData;
      const errorMessage = (writeError as any)?.message || "Transaction failed";
      console.error("[createSubscription] Write error:", writeError);
      setError(`Transaction failed: ${errorMessage}`);
      resetWrite();
    }
  }, [writeError, isWriteError, resetWrite]);

  useEffect(() => {
    if (receiptError || isReceiptError) {
      setIsCreatingOnChain(false);
      delete (window as any).__pendingSubscriptionData;
      const errorMessage = (receiptError as any)?.message || "Transaction receipt failed";
      setError(`Transaction receipt failed: ${errorMessage}`);
    }
  }, [receiptError, isReceiptError]);

  useEffect(() => {
    if (receipt && isCreatingOnChain) {
      console.log("[createSubscription] Transaction receipt received:", {
        transactionHash: receipt.transactionHash,
        status: receipt.status,
        logs: receipt.logs?.length,
      });

      // Check if transaction was successful
      if (receipt.status === "reverted") {
        console.error("[createSubscription] Transaction was reverted!");
        setIsCreatingOnChain(false);
        delete (window as any).__pendingSubscriptionData;
        setError("Transaction was reverted. Please check the block explorer for details.");
        return;
      }

      const subscriptionIdBytes32 = extractSubscriptionIdFromReceipt(receipt);
      const subscriptionData = (window as any).__pendingSubscriptionData;

      console.log("[createSubscription] Extracted subscription ID:", subscriptionIdBytes32);

      if (subscriptionIdBytes32 && subscriptionData) {
        console.log("[createSubscription] Saving to database...");
        saveSubscriptionToDatabase(subscriptionData, receipt, subscriptionIdBytes32);
      } else {
        setIsCreatingOnChain(false);
        delete (window as any).__pendingSubscriptionData;
        console.error("[createSubscription] Could not extract subscription ID from receipt");
        setError("Could not extract subscription ID from transaction. Please check the block explorer.");
      }
    }
  }, [receipt, isCreatingOnChain]);

  const retryDatabaseSave = async () => {
    const subscriptionData = dbSaveError?.subscriptionData;
    const receipt = dbSaveError?.receipt;
    const subscriptionIdBytes32 = dbSaveError?.subscriptionIdBytes32 || extractSubscriptionIdFromReceipt(receipt);

    if (!subscriptionData || !receipt) {
      setError("No pending subscription data to retry.");
      return;
    }

    if (!subscriptionIdBytes32) {
      setError("Could not extract subscription ID from transaction.");
      return;
    }

    setError(null);
    setIsCreatingOnChain(true);
    await saveSubscriptionToDatabase(subscriptionData, receipt, subscriptionIdBytes32);
  };

  return {
    createSubscription,
    isCreatingOnChain,
    isWaitingForTx,
    error,
    dbSaveError,
    retryDatabaseSave,
    createTxHash,
  };
}

