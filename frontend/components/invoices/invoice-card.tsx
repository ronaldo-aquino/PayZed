import Link from "next/link";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { truncateAddress, formatDate } from "@/lib/utils";
import type { Invoice } from "@backend/lib/supabase";

type TabType = "all" | "paid" | "pending" | "paidByMe";

interface InvoiceCardProps {
  invoice: Invoice;
  address: string;
  activeTab: TabType;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  getStatusColor: (status: string) => string;
}

export function InvoiceCard({
  invoice,
  address,
  activeTab,
  copiedId,
  onCopy,
  getStatusColor,
}: InvoiceCardProps) {
  const isInvoiceCreatedByUser =
    invoice.user_wallet_address.toLowerCase() === address?.toLowerCase();
  const isInvoicePaidByUser = invoice.payer_address?.toLowerCase() === address?.toLowerCase();

  const shouldShowFee =
    isInvoiceCreatedByUser && invoice.fee_amount !== undefined && invoice.fee_amount > 0;

  const creationGas = invoice.gas_cost_creation ?? invoice.gas_cost;
  const shouldShowCreationGas =
    isInvoiceCreatedByUser && creationGas !== undefined && creationGas > 0;

  const shouldShowPaymentGas =
    invoice.status === "paid" &&
    invoice.paid_at !== undefined &&
    invoice.paid_at !== null &&
    invoice.payer_address !== undefined &&
    invoice.payer_address !== null &&
    invoice.payer_address.trim() !== "" &&
    isInvoicePaidByUser &&
    invoice.gas_cost_payment !== undefined &&
    invoice.gas_cost_payment !== null &&
    invoice.gas_cost_payment > 0;

  return (
    <Card className="border-2 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-background to-muted/20">
      <CardContent className="pt-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {invoice.amount} {invoice.currency}
                </h3>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${getStatusColor(
                    invoice.status
                  )}`}
                >
                  {invoice.status}
                </span>
              </div>
              {invoice.description && (
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  {invoice.description}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
                  onCopy(`${origin}${invoice.payment_link}`, invoice.id);
                }}
                className="h-9 w-9 p-0 hover:bg-primary/10"
                title="Copy payment link"
              >
                {copiedId === invoice.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Link href={invoice.payment_link}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-primary/10"
                  title="View invoice"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-border/60">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Invoice ID
              </p>
              <p className="font-mono text-sm font-medium break-all bg-muted/50 px-2 py-1.5 rounded-md">
                {truncateAddress(invoice.id)}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {activeTab === "paidByMe" ? "From" : "Receiver"}
              </p>
              <p className="font-mono text-sm font-medium bg-muted/50 px-2 py-1.5 rounded-md">
                {activeTab === "paidByMe"
                  ? truncateAddress(invoice.user_wallet_address)
                  : truncateAddress(invoice.receiver_wallet_address)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Created
                </p>
                <p className="text-sm font-medium">{formatDate(invoice.created_at)}</p>
              </div>
              {invoice.paid_at && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Paid
                  </p>
                  <p className="text-sm font-medium">{formatDate(invoice.paid_at)}</p>
                </div>
              )}
            </div>
          </div>

          {(shouldShowFee || shouldShowCreationGas || shouldShowPaymentGas) && (
            <div className="flex flex-wrap gap-4 pt-3 border-t border-border/40">
              {shouldShowFee && invoice.fee_amount !== undefined && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    Fee:
                  </span>
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    {invoice.fee_amount.toFixed(6)} {invoice.currency}
                  </span>
                </div>
              )}
              {shouldShowCreationGas && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    Gas
                  </span>
                  <span className="text-xs font-medium text-purple-900 dark:text-purple-100">
                    {(() => {
                      const gasValue = Number(creationGas);
                      if (isNaN(gasValue) || gasValue <= 0) return "N/A";
                      const displayValue = Math.min(gasValue, 10);
                      return `${displayValue.toFixed(6)} USDC`;
                    })()}
                  </span>
                </div>
              )}
              {shouldShowPaymentGas && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    Gas
                  </span>
                  <span className="text-xs font-medium text-purple-900 dark:text-purple-100">
                    {(() => {
                      const gasValue = Number(invoice.gas_cost_payment);
                      if (isNaN(gasValue) || gasValue <= 0) return "N/A";
                      const displayValue = Math.min(gasValue, 10);
                      return `${displayValue.toFixed(6)} USDC`;
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
