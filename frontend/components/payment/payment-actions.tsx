import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { PAYZED_CONTRACT_ADDRESS, ARC_TESTNET_CHAIN_ID } from "@/lib/constants";
import type { Invoice } from "@backend/lib/supabase";
import { ArrowRightLeft, Wallet, AlertCircle } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";

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
  const { chain } = useAccount();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

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
    const isOnArcTestnet = chain?.id === ARC_TESTNET_CHAIN_ID;
    const handleSwitchToArc = async () => {
      if (switchChainAsync) {
        try {
          await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
        } catch (error) {
          console.error("Failed to switch chain:", error);
        }
      }
    };

    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
              Cannot access invoice on-chain
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {isOnArcTestnet 
                ? "Unable to read the invoice from the contract. This may be a temporary network issue. Please try refreshing the page or check your connection."
                : "To access the invoice and make a payment, you need to be connected to Arc Testnet. Please switch your wallet to Arc Testnet to continue."}
            </p>
          </div>
        </div>
        {!isOnArcTestnet && typeof switchChainAsync !== 'undefined' && (
          <Button
            onClick={handleSwitchToArc}
            disabled={isSwitchingChain}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-600 dark:hover:bg-yellow-700"
            size="lg"
          >
            {isSwitchingChain ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Switching to Arc Testnet...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Switch to Arc Testnet (Chain ID: {ARC_TESTNET_CHAIN_ID})
              </>
            )}
          </Button>
        )}
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
