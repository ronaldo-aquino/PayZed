import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS } from "@/lib/constants";
import type { Subscription } from "@backend/lib/supabase";

interface SubscriptionActionsProps {
  subscription: Subscription;
  isConnected: boolean;
  address: string | undefined;
  onChainSubscription: any;
  needsApproval: boolean;
  isApproving: boolean;
  isApprovalConfirming: boolean;
  isPaying: boolean;
  isPaymentConfirming: boolean;
  subscriptionIdBytes32: `0x${string}` | undefined;
  transferHash: `0x${string}` | undefined;
  isPayError: boolean;
  payError: any;
  isPaymentReceiptError: boolean;
  paymentReceiptError: any;
  renewalFee: number;
  totalAmount: number;
  onApprove: () => void;
  onPay: () => void;
}

export function SubscriptionActions({
  subscription,
  isConnected,
  address,
  onChainSubscription,
  needsApproval,
  isApproving,
  isApprovalConfirming,
  isPaying,
  isPaymentConfirming,
  subscriptionIdBytes32,
  transferHash,
  isPayError,
  payError,
  isPaymentReceiptError,
  paymentReceiptError,
  renewalFee,
  totalAmount,
  onApprove,
  onPay,
}: SubscriptionActionsProps) {
  if (!INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Contract not configured. Please set NEXT_PUBLIC_INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectButton />;
  }

  const nextPaymentDate = new Date(subscription.next_payment_due);
  const isPaymentDue = nextPaymentDate <= new Date();

  // Check if payer is already set and if current address matches
  const isPayerSet = 
    subscription.payer_wallet_address && 
    subscription.payer_wallet_address !== "0x0000000000000000000000000000000000000000" &&
    subscription.payer_wallet_address.toLowerCase() !== "0x0000000000000000000000000000000000000000";
  
  const isCorrectPayer = 
    !isPayerSet || 
    (address && address.toLowerCase() === subscription.payer_wallet_address.toLowerCase());

  return (
    <div className="space-y-2">
      {!onChainSubscription && subscription.status === "pending" && subscriptionIdBytes32 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ℹ️ Subscription is registered on-chain. You can proceed with payment.
          </p>
        </div>
      )}
      {!onChainSubscription && subscription.status !== "pending" && !subscriptionIdBytes32 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Subscription is not yet registered on-chain. Please wait for the registration to complete.
          </p>
        </div>
      )}
      {!isPaymentDue && subscription.status === "active" && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Next payment is due on {new Date(subscription.next_payment_due).toLocaleDateString()}
          </p>
        </div>
      )}
      {/* Only show payer restriction for active subscriptions, not pending ones */}
      {subscription.status !== "pending" && isPayerSet && !isCorrectPayer && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            Only the wallet that made the first payment ({subscription.payer_wallet_address.slice(0, 6)}...{subscription.payer_wallet_address.slice(-4)}) can pay this subscription.
          </p>
        </div>
      )}
      {needsApproval && (
        <Button
          onClick={onApprove}
          disabled={isApproving || isApprovalConfirming}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {isApproving || isApprovalConfirming
            ? "Approving..."
            : `Approve ${subscription.currency}`}
        </Button>
      )}
      <Button
        onClick={onPay}
        disabled={
          Boolean(
            isPaying ||
            isPaymentConfirming ||
            needsApproval ||
            !subscriptionIdBytes32 ||
            // For pending subscriptions, allow payment even if onChainSubscription is not loaded yet
            // (it might be in the process of being registered)
            (subscription.status !== "pending" && !onChainSubscription) ||
            (subscription.status === "active" && !isPaymentDue) ||
            (subscription.status !== "pending" && subscription.status !== "active") ||
            (subscription.status !== "pending" && isPayerSet && !isCorrectPayer)
          )
        }
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isPaying || isPaymentConfirming
          ? "Processing Payment..."
          : !onChainSubscription
            ? "Waiting for on-chain registration..."
            : subscription.status === "pending"
              ? `Make First Payment: ${subscription.amount} ${subscription.currency} (+ ${renewalFee.toFixed(6)} ${subscription.currency} fee)`
              : subscription.status === "active" && !isPaymentDue
                ? "Payment not due yet"
                : (subscription.status === "cancelled_by_creator" || subscription.status === "cancelled_by_payer" || subscription.status === "paused")
                  ? "Subscription is not active"
                  : isPayerSet && !isCorrectPayer
                    ? "Wrong wallet address"
                    : isPayerSet
                      ? `Pay ${subscription.amount} ${subscription.currency} (+ ${renewalFee.toFixed(6)} ${subscription.currency} fee)`
                    : `Make First Payment: ${subscription.amount} ${subscription.currency} (+ ${renewalFee.toFixed(6)} ${subscription.currency} fee)`}
      </Button>
      {onChainSubscription && (
        <div className="pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-1">
            On-chain Status
          </p>
          <p className="text-sm font-medium text-center">
            {onChainSubscription.status === 0
              ? "Pending"
              : onChainSubscription.status === 1
                ? "Active"
                : onChainSubscription.status === 2
                  ? "Cancelled by Creator"
                  : onChainSubscription.status === 3
                    ? "Cancelled by Payer"
                    : onChainSubscription.status === 4
                      ? "Paused"
                      : "Unknown"}
          </p>
        </div>
      )}
      {transferHash && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
            Payment Successful!
          </p>
          <a
            href={`https://testnet.arcscan.app/tx/${transferHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            View Transaction
          </a>
        </div>
      )}
      {(isPayError || isPaymentReceiptError) && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">
            {payError?.message ||
              paymentReceiptError?.message ||
              "Payment failed. Please try again."}
          </p>
        </div>
      )}
    </div>
  );
}

