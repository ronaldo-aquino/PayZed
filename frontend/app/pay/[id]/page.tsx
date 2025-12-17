"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { keccak256, toHex } from "viem";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentDetails } from "@/components/payment/payment-details";
import { QRCodeSection } from "@/components/payment/qr-code-section";
import { PaymentActions } from "@/components/payment/payment-actions";
import { CCTPPaymentModal } from "@/components/payment/cctp-payment-modal";
import { useInvoice } from "@/hooks/useInvoice";
import { usePayInvoice } from "@/hooks/usePayInvoice";

export default function PaymentPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const [cctpModalOpen, setCctpModalOpen] = useState(false);

  const { invoice, loading, refetch } = useInvoice(invoiceId);

  const invoiceIdBytes32 = invoice ? keccak256(toHex(invoice.id)) : undefined;

  const {
    onChainInvoice,
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
  } = usePayInvoice(invoice, invoiceIdBytes32, () => {
    setTimeout(() => {
      refetch();
      const interval = setInterval(() => {
        refetch();
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
      <div className="min-h-screen flex items-center justify-center">
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
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="space-y-3 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Invoice Payment
            </h1>
            <p className="text-lg text-muted-foreground">Pay this invoice using your Web3 wallet</p>
          </div>
          <Card className="border-2 shadow-xl bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="space-y-2 pb-8">
              <CardTitle className="text-2xl font-bold">Payment Details</CardTitle>
              <CardDescription className="text-base">
                Review the invoice information and complete your payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <PaymentDetails invoice={invoice} />
                <QRCodeSection qrCodeValue={paymentUrl} copied={copied} onCopy={copyPaymentLink} />
              </div>

              {invoice.status === "pending" && (
                <div className="border-t-2 border-border/60 pt-8 space-y-5">
                  <h3 className="text-xl font-bold">Pay with Wallet</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Pay on Arc Testnet</h4>
                  <PaymentActions
                    invoice={invoice}
                    isConnected={isConnected}
                    onChainInvoice={onChainInvoice}
                    needsApproval={needsApproval}
                    isApproving={isApproving}
                    isApprovalConfirming={isApprovalConfirming}
                    isPaying={isPaying}
                    isPaymentConfirming={isPaymentConfirming}
                    invoiceIdBytes32={invoiceIdBytes32}
                    transferHash={transferHash}
                    isPayError={isPayError}
                    payError={payError}
                    isPaymentReceiptError={isPaymentReceiptError}
                    paymentReceiptError={paymentReceiptError}
                    onApprove={handleApprove}
                    onPay={handlePayInvoice}
                        onOpenCCTPModal={() => setCctpModalOpen(true)}
                  />
                    </div>
                  </div>
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
            </CardContent>
          </Card>
        </div>
      </main>

      {/* CCTP Payment Modal */}
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
