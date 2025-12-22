"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { keccak256, toHex } from "viem";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentDetails } from "@/components/payment/payment-details";
import { QRCodeModal } from "@/components/payment/qr-code-modal";
import { CCTPPaymentModal } from "@/components/payment/cctp-payment-modal";
import { ArcPaymentModal } from "@/components/payment/arc-payment-modal";
import { useInvoice } from "@/hooks/useInvoice";
import { usePayInvoice } from "@/hooks/usePayInvoice";
import { QrCode, Loader2 } from "lucide-react";

export default function PaymentPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const [arcModalOpen, setArcModalOpen] = useState(false);
  const [cctpModalOpen, setCctpModalOpen] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);

  const { invoice, loading, refetch } = useInvoice(invoiceId);

  const invoiceIdBytes32 = invoice ? keccak256(toHex(invoice.id)) : undefined;

  const {
    onChainInvoice,
    refetchOnChainInvoice,
    needsApproval,
    isApproving,
    isApprovalConfirming,
    isPaying,
    isPaymentConfirming,
    isPayError,
    payError,
    isPaymentReceiptError,
    paymentReceiptError,
    transferHash,
    handleApprove,
    handlePayInvoice,
    balance,
    decimals,
  } = usePayInvoice(invoice, invoiceIdBytes32, () => {
    setTimeout(() => {
      refetch();
      refetchOnChainInvoice();
      const interval = setInterval(() => {
        refetch();
        refetchOnChainInvoice();
      }, 2000);
      setTimeout(() => clearInterval(interval), 10000);
    }, 500);
  });

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Invoice not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paymentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="max-w-3xl mx-auto">
            <Card className="border-2 shadow-xl bg-gradient-to-br from-background to-muted/30">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold">Payment Details</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Review the invoice information and complete your payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <PaymentDetails
                  invoice={invoice}
                  isConnected={isConnected}
                  onChainInvoice={onChainInvoice}
                  onOpenArcModal={() => setArcModalOpen(true)}
                  onOpenCCTPModal={() => setCctpModalOpen(true)}
                />

                {invoice.status === "pending" && (
                  <div className="hidden md:block border-t-2 border-border/60 pt-4">
                    <Button
                      onClick={() => setQrCodeModalOpen(true)}
                      variant="outline"
                      size="lg"
                      className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold"
                    >
                      <QrCode className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm md:text-base">
                        Scan this page with your mobile device to access the payment page
                      </span>
                    </Button>
                  </div>
                )}

                {invoice.status === "paid" && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      This invoice has been paid
                    </p>
                    {invoice.transaction_hash && (
                      <a
                        href={`https://testnet.arcscan.app/tx/${invoice.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 dark:text-green-400 hover:underline"
                      >
                        View Transaction
                      </a>
                    )}
                  </div>
                )}

                {onChainInvoice && (
                  <div className="border-t-2 border-border/60 pt-4 mt-6">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Status On-chain:
                      </p>
                      {(isApproving || isApprovalConfirming || isPaying || isPaymentConfirming) && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      <p className={`text-sm font-medium ${
                        onChainInvoice.status === 1 ? "text-green-600 dark:text-green-400" : ""
                      }`}>
                        {onChainInvoice.status === 1 ? "Paid" : (isApproving || isApprovalConfirming || isPaying || isPaymentConfirming) ? "Processing..." : "Pending"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <QRCodeModal
        open={qrCodeModalOpen}
        onOpenChange={setQrCodeModalOpen}
        qrCodeValue={paymentUrl}
        copied={copied}
        onCopy={copyPaymentLink}
      />

      <ArcPaymentModal
        invoice={invoice}
        invoiceIdBytes32={invoiceIdBytes32}
        open={arcModalOpen}
        onOpenChange={setArcModalOpen}
        needsApproval={needsApproval}
        isApproving={isApproving}
        isApprovalConfirming={isApprovalConfirming}
        isPaying={isPaying}
        isPaymentConfirming={isPaymentConfirming}
        isPayError={isPayError}
        payError={payError}
        isPaymentReceiptError={isPaymentReceiptError}
        paymentReceiptError={paymentReceiptError}
        transferHash={transferHash}
        onApprove={handleApprove}
        onPay={handlePayInvoice}
        onPaymentSuccess={() => {
          refetch();
          setTimeout(() => {
            refetch();
            refetchOnChainInvoice();
          }, 1000);
          setTimeout(() => {
            refetch();
            refetchOnChainInvoice();
          }, 3000);
        }}
      />

      {invoice.currency === "USDC" && (
        <CCTPPaymentModal
          invoice={invoice}
          invoiceIdBytes32={invoiceIdBytes32}
          open={cctpModalOpen}
          onOpenChange={setCctpModalOpen}
          onPaymentSuccess={() => {
            refetch();
            setTimeout(() => refetch(), 1000);
            setTimeout(() => refetch(), 3000);
          }}
        />
      )}
    </div>
  );
}
