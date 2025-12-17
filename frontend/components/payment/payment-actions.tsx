import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { INVOPAY_CONTRACT_ADDRESS } from "@/lib/constants";
import type { Invoice } from "@backend/lib/supabase";
import { ArrowRightLeft } from "lucide-react";

interface PaymentActionsProps {
  invoice: Invoice;
  isConnected: boolean;
  onChainInvoice: any;
  needsApproval: boolean;
  isApproving: boolean;
  isApprovalConfirming: boolean;
  isPaying: boolean;
  isPaymentConfirming: boolean;
  invoiceIdBytes32: `0x${string}` | undefined;
  transferHash: `0x${string}` | undefined;
  isPayError: boolean;
  payError: any;
  isPaymentReceiptError: boolean;
  paymentReceiptError: any;
  onApprove: () => void;
  onPay: () => void;
  onOpenCCTPModal?: () => void;
}

export function PaymentActions({
  invoice,
  isConnected,
  onChainInvoice,
  needsApproval,
  isApproving,
  isApprovalConfirming,
  isPaying,
  isPaymentConfirming,
  invoiceIdBytes32,
  transferHash,
  isPayError,
  payError,
  isPaymentReceiptError,
  paymentReceiptError,
  onApprove,
  onPay,
  onOpenCCTPModal,
}: PaymentActionsProps) {
  if (!INVOPAY_CONTRACT_ADDRESS) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Contract not configured. Please set NEXT_PUBLIC_INVOPAY_CONTRACT_ADDRESS
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectButton />;
  }

  return (
    <div className="space-y-2">
      {!onChainInvoice && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Invoice is not yet registered on-chain. Please wait for the registration to complete.
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
          {isApproving || isApprovalConfirming ? "Approving..." : `Approve ${invoice.currency}`}
        </Button>
      )}
      <Button
        onClick={onPay}
        disabled={
          isPaying || isPaymentConfirming || needsApproval || !invoiceIdBytes32 || !onChainInvoice
        }
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isPaying || isPaymentConfirming
          ? "Processing Payment..."
          : !onChainInvoice
            ? "Waiting for on-chain registration..."
            : `Pay ${invoice.amount} ${invoice.currency}`}
      </Button>
      
      {invoice.currency === "USDC" && onOpenCCTPModal && (
        <Button
          onClick={onOpenCCTPModal}
          disabled={needsApproval || !onChainInvoice}
          variant="outline"
          className="w-full h-12 text-base font-semibold border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
          size="lg"
        >
          <ArrowRightLeft className="mr-2 h-5 w-5" />
          Pay with USDC from Another Chain
        </Button>
      )}
      
      {onChainInvoice && (
        <div className="pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-1">
            On-chain Status
          </p>
          <p className="text-sm font-medium text-center">
            {onChainInvoice.status === 1 ? "Paid" : "Pending"}
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
