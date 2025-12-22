import { useState } from "react";
import { formatDate, truncateAddressMiddle } from "@/lib/utils";
import { StatusBadge } from "@/components/invoices/status-badge";
import type { Invoice } from "@backend/lib/supabase";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentActions } from "./payment-actions";

interface PaymentDetailsProps {
  invoice: Invoice;
  isConnected: boolean;
  onChainInvoice: any;
  onOpenArcModal?: () => void;
  onOpenCCTPModal?: () => void;
}

export function PaymentDetails({ 
  invoice,
  isConnected,
  onChainInvoice,
  onOpenArcModal,
  onOpenCCTPModal,
}: PaymentDetailsProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const copyToClipboard = (text: string, type: "address" | "hash") => {
    navigator.clipboard.writeText(text);
    if (type === "address") {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 shadow-lg">
        <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">
          Amount to Pay
        </p>
        <p className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          {invoice.amount} {invoice.currency}
        </p>
      </div>

      {invoice.status === "pending" && (
        <div className="pt-2">
          <PaymentActions
            invoice={invoice}
            isConnected={isConnected}
            onChainInvoice={onChainInvoice}
            onOpenArcModal={onOpenArcModal}
            onOpenCCTPModal={onOpenCCTPModal}
          />
        </div>
      )}

      <div className="space-y-4 sm:space-y-5 p-4 sm:p-5 rounded-lg sm:rounded-xl bg-muted/30 border border-border/60">
        {invoice.description && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2">
              Description
            </p>
            <p className="text-sm font-medium leading-relaxed">{invoice.description}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2">
            Receiver Address
          </p>
          <div className="flex items-center gap-2 bg-background px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border">
            <p className="font-mono text-xs sm:text-sm font-medium flex-1 break-all">
              {truncateAddressMiddle(invoice.receiver_wallet_address)}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => copyToClipboard(invoice.receiver_wallet_address, "address")}
            >
              {copiedAddress ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2">
            Status
          </p>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2">
              Created
            </p>
            <p className="text-xs sm:text-sm font-medium">{formatDate(invoice.created_at)}</p>
          </div>
          {invoice.paid_at && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2">
                Paid
              </p>
              <p className="text-xs sm:text-sm font-medium">{formatDate(invoice.paid_at)}</p>
            </div>
          )}
        </div>

        {invoice.transaction_hash && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2">
              Transaction Hash
            </p>
            <div className="flex items-center gap-2 bg-background px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border">
              <a
                href={`https://testnet.arcscan.app/tx/${invoice.transaction_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-primary hover:underline font-mono flex-1 break-all"
              >
                {truncateAddressMiddle(invoice.transaction_hash)}
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => invoice.transaction_hash && copyToClipboard(invoice.transaction_hash, "hash")}
              >
                {copiedHash ? (
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                asChild
              >
                <a
                  href={`https://testnet.arcscan.app/tx/${invoice.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
