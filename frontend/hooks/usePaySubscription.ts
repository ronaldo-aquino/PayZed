import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi";
import { parseUnits, decodeEventLog, parseAbiItem, formatUnits } from "viem";
import {
  INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS,
  ERC20_ABI,
  USDC_CONTRACT_ADDRESS,
  EURC_CONTRACT_ADDRESS,
} from "@/lib/constants";
import { INVOPAY_SUBSCRIPTION_ABI } from "@/lib/subscription-contract-abi";
import type { Subscription } from "@backend/lib/supabase";
import { getTransactionReceipt, calculateGasCost, uuidToBytes32 } from "@backend/lib/services/contract.service";
import { getPaySubscriptionArgs, calculateRenewalFee } from "@backend/lib/services/subscription.service";
import {
  updateSubscription,
  createSubscriptionPayment,
} from "@backend/lib/services/subscription-db.service";
import {
  getDecimalsArgs,
  getAllowanceArgs,
  getBalanceArgs,
  needsApproval,
  parseTokenAmount,
  getApproveArgs,
} from "@backend/lib/services/token.service";

export function usePaySubscription(
  subscription: Subscription | null,
  subscriptionIdBytes32: `0x${string}` | undefined,
  onPaymentSuccess?: () => void
) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [transferHash, setTransferHash] = useState<`0x${string}` | undefined>();

  const tokenAddress =
    subscription?.currency === "USDC" ? USDC_CONTRACT_ADDRESS : EURC_CONTRACT_ADDRESS;

  const decimalsArgs =
    subscription && tokenAddress ? getDecimalsArgs(tokenAddress as `0x${string}`) : undefined;

  const { data: decimals } = useReadContract({
    ...decimalsArgs,
    query: {
      enabled: !!subscription,
    },
  });

  const allowanceArgs =
    address && INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS && tokenAddress
      ? getAllowanceArgs({
          tokenAddress: tokenAddress as `0x${string}`,
          owner: address as `0x${string}`,
          spender: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as `0x${string}`,
        })
      : undefined;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...allowanceArgs,
    query: {
      enabled: !!address && !!subscription && !!INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS,
    },
  });

  const balanceArgs =
    address && tokenAddress
      ? getBalanceArgs(tokenAddress as `0x${string}`, address as `0x${string}`)
      : undefined;

  const { data: balance } = useReadContract({
    ...balanceArgs,
    query: {
      enabled: !!address && !!subscription && !!tokenAddress,
    },
  });

  const { data: onChainSubscription } = useReadContract({
    address: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as `0x${string}`,
    abi: INVOPAY_SUBSCRIPTION_ABI,
    functionName: "getSubscription",
    args: subscriptionIdBytes32 ? [subscriptionIdBytes32] : undefined,
    query: {
      enabled: !!subscriptionIdBytes32 && !!INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS,
    },
  });

  const {
    writeContract: writeApproval,
    data: approvalData,
    isPending: isApproving,
  } = useWriteContract();

  const { isLoading: isApprovalConfirming, data: approvalReceipt } = useWaitForTransactionReceipt({
    hash: approvalData,
  });

  const {
    writeContract: writePaySubscription,
    data: paySubscriptionData,
    isPending: isPaying,
    error: payError,
    isError: isPayError,
  } = useWriteContract();

  const {
    isLoading: isPaymentConfirming,
    data: paymentReceipt,
    error: paymentReceiptError,
    isError: isPaymentReceiptError,
  } = useWaitForTransactionReceipt({
    hash: paySubscriptionData,
  });

  const renewalFee = subscription ? calculateRenewalFee(subscription.amount) : 0;
  const totalAmount = subscription ? subscription.amount + renewalFee : 0;

  const needsApprovalCheck =
    subscription &&
    decimals &&
    typeof decimals === "number" &&
    allowance !== undefined &&
    allowance !== null &&
    typeof allowance === "bigint"
      ? needsApproval(allowance, parseUnits(totalAmount.toString(), decimals))
      : false;

  const handleApprove = async () => {
    if (
      !subscription ||
      !address ||
      !decimals ||
      typeof decimals !== "number" ||
      !INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS
    )
      return;

    const amount = parseTokenAmount(totalAmount, decimals);
    const approveArgs = getApproveArgs({
      tokenAddress: tokenAddress as `0x${string}`,
      amount,
      spender: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as `0x${string}`,
    });

    writeApproval(approveArgs);
  };

  const handlePaySubscription = async () => {
    if (!subscription || !subscriptionIdBytes32 || !INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS) {
      alert("Contract not configured or subscription not found");
      return;
    }

    if (
      subscription &&
      decimals &&
      typeof decimals === "number" &&
      balance !== undefined &&
      typeof balance === "bigint"
    ) {
      const subscriptionAmount = parseTokenAmount(totalAmount, decimals);
      if (balance < subscriptionAmount) {
        alert(
          `Insufficient balance. You need ${totalAmount.toFixed(6)} ${subscription.currency} to pay this subscription (including renewal fee), but you only have ${formatUnits(balance, decimals)} ${subscription.currency}.`
        );
        return;
      }
    } else if (
      subscription &&
      decimals &&
      typeof decimals === "number" &&
      (balance === undefined || balance === null)
    ) {
      alert("Unable to check your balance. Please try again.");
      return;
    }

    // Use subscriptionIdBytes32 directly (from database, saved from on-chain creation)
    // Don't calculate from UUID - the contract uses a different ID
    if (!subscriptionIdBytes32) {
      alert("Subscription ID not found. Please refresh the page.");
      return;
    }

    const payArgs = {
      address: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as `0x${string}`,
      abi: INVOPAY_SUBSCRIPTION_ABI,
      functionName: "paySubscription" as const,
      args: [subscriptionIdBytes32] as const,
    };
    writePaySubscription(payArgs);
  };

  useWatchContractEvent({
    address: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as `0x${string}`,
    abi: INVOPAY_SUBSCRIPTION_ABI,
    eventName: "SubscriptionPaid",
    onLogs: async (logs) => {
      const relevantLog = logs.find(
        (log) => log.args.subscriptionId?.toLowerCase() === subscriptionIdBytes32?.toLowerCase()
      );
      if (relevantLog && subscription) {
        const payerAddress = relevantLog.args.payer;
        if (!payerAddress) return;

        const payerAddressLower = String(payerAddress).toLowerCase();

        let paymentGasCost: number | undefined = undefined;
        try {
          if (relevantLog.transactionHash && publicClient) {
            const receipt = await getTransactionReceipt(relevantLog.transactionHash);
            paymentGasCost = calculateGasCost(receipt);
          }
        } catch (error) {
          console.error("Error calculating gas cost:", error);
        }

        try {
          const nextPaymentDue = new Date(
            Number(relevantLog.args.nextPaymentDue) * 1000
          ).toISOString();

          // Check if this is the first payment (payer_wallet_address is zero address or status is pending)
          const isFirstPayment = 
            subscription.status === "pending" ||
            !subscription.payer_wallet_address || 
            subscription.payer_wallet_address === "0x0000000000000000000000000000000000000000" ||
            subscription.payer_wallet_address.toLowerCase() === "0x0000000000000000000000000000000000000000";

          await createSubscriptionPayment({
            subscription_id: subscription.id,
            payer_wallet_address: payerAddressLower,
            amount: subscription.amount,
            currency: subscription.currency,
            transaction_hash: relevantLog.transactionHash || undefined,
            payment_date: new Date().toISOString(),
            renewal_fee: renewalFee,
            gas_cost: paymentGasCost,
          });

          // Update subscription with total payments and next payment due
          // If first payment, also update payer_wallet_address and status to active
          // Calculate next payment from NOW (when it becomes active), not from creation date
          const updateData: any = {
            total_payments: subscription.total_payments + 1,
            next_payment_due: nextPaymentDue, // This comes from the contract and is calculated from payment time
          };

          if (isFirstPayment) {
            updateData.payer_wallet_address = payerAddressLower;
            updateData.status = "active"; // Activate subscription on first payment
          }

          await updateSubscription(subscription.id, updateData);

          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
        } catch (updateError) {
          console.error("Failed to update subscription payment:", updateError);
        }
      }
    },
  });

  useEffect(() => {
    if (approvalReceipt) {
      refetchAllowance();
    }
  }, [approvalReceipt, refetchAllowance]);

  useEffect(() => {
    if (paymentReceipt && subscription && paymentReceipt.status === "success") {
      setTransferHash(paymentReceipt.transactionHash);

      (async () => {
        const paymentGasCost = calculateGasCost(paymentReceipt);
        const payerAddress = address ? String(address).toLowerCase() : null;

        if (!payerAddress) {
          return;
        }

        try {
          const subscriptionPaidEventAbi = parseAbiItem(
            "event SubscriptionPaid(bytes32 indexed subscriptionId, address indexed payer, address indexed receiver, uint256 amount, address tokenAddress, uint256 nextPaymentDue, uint256 totalPayments)"
          );

          let nextPaymentDue = subscription.next_payment_due;
          let totalPayments = subscription.total_payments + 1;

          if (paymentReceipt.logs && subscriptionIdBytes32 && INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS) {
            for (const log of paymentReceipt.logs) {
              if (log.address?.toLowerCase() !== INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS.toLowerCase()) {
                continue;
              }

              try {
                const decoded = decodeEventLog({
                  abi: [subscriptionPaidEventAbi],
                  data: log.data,
                  topics: log.topics,
                });

                if (decoded.args.subscriptionId?.toLowerCase() === subscriptionIdBytes32.toLowerCase()) {
                  nextPaymentDue = new Date(
                    Number(decoded.args.nextPaymentDue) * 1000
                  ).toISOString();
                  totalPayments = Number(decoded.args.totalPayments);
                  break;
                }
              } catch (error) {
                continue;
              }
            }
          }

          // Check if this is the first payment (status is pending or payer_wallet_address is zero address)
          const isFirstPayment = 
            subscription.status === "pending" ||
            !subscription.payer_wallet_address || 
            subscription.payer_wallet_address === "0x0000000000000000000000000000000000000000" ||
            subscription.payer_wallet_address.toLowerCase() === "0x0000000000000000000000000000000000000000";

          await createSubscriptionPayment({
            subscription_id: subscription.id,
            payer_wallet_address: payerAddress,
            amount: subscription.amount,
            currency: subscription.currency,
            transaction_hash: paymentReceipt.transactionHash,
            payment_date: new Date().toISOString(),
            renewal_fee: renewalFee,
            gas_cost: paymentGasCost,
          });

          // Update subscription with total payments and next payment due
          // If first payment, also update payer_wallet_address and status to active
          // Next payment is calculated from payment time (from contract)
          const updateData: any = {
            total_payments: totalPayments,
            next_payment_due: nextPaymentDue, // This comes from the contract and is calculated from payment time
          };

          if (isFirstPayment) {
            updateData.payer_wallet_address = payerAddress;
            updateData.status = "active"; // Activate subscription on first payment
          }

          await updateSubscription(subscription.id, updateData);

          if (onPaymentSuccess) {
            setTimeout(() => onPaymentSuccess(), 1000);
          }
        } catch (updateError) {
          console.error("Failed to update subscription payment:", updateError);
        }
      })();
    }
  }, [paymentReceipt, subscription, subscriptionIdBytes32, address, renewalFee, onPaymentSuccess]);

  return {
    decimals,
    allowance,
    balance,
    onChainSubscription,
    needsApproval: needsApprovalCheck,
    isApproving,
    isApprovalConfirming,
    isPaying,
    isPaymentConfirming,
    isPayError,
    payError,
    isPaymentReceiptError,
    paymentReceiptError,
    transferHash,
    renewalFee,
    totalAmount,
    handleApprove,
    handlePaySubscription,
  };
}

