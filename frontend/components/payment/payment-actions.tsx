import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { PAYZED_CONTRACT_ADDRESS } from "@/lib/constants";
import type { Invoice } from "@backend/lib/supabase";
import { ArrowRightLeft, Wallet } from "lucide-react";

interface PaymentActionsProps {
  invoice: Invoice;
  isConnected: boolean;
  onChainInvoice: any;
  needsApproval?: boolean;
  isApproving?: boolean;
  isApprovalConfirming?: boolean;
  isPaying?: boolean;
  isPaymentConfirming?: boolean;
  invoiceIdBytes32?: `0x${string}` | undefined;
  transferHash?: `0x${string}` | undefined;
  isPayError?: boolean;
  payError?: any;
  isPaymentReceiptError?: boolean;
  paymentReceiptError?: any;
  onOpenArcModal?: () => void;
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
  onOpenArcModal,
  onOpenCCTPModal,
}: PaymentActionsProps) {
  if (!PAYZED_CONTRACT_ADDRESS) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Contract not configured. Please set NEXT_PUBLIC_PAYZED_CONTRACT_ADDRESS
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectButton />;
  }

  if (!onChainInvoice) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Invoice is not yet registered on-chain. Please wait for the registration to complete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={onOpenArcModal}
        disabled={!onChainInvoice}
        className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold"
        size="lg"
      >
        <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        Pay on Arc Network
      </Button>

      {invoice.currency === "USDC" && onOpenCCTPModal && (
        <Button
          onClick={onOpenCCTPModal}
          disabled={!onChainInvoice}
          variant="outline"
          className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
          size="lg"
        >
          <ArrowRightLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Pay from Another Chain
        </Button>
      )}
    </div>
  );
}
