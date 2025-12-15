"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { keccak256, toHex } from "viem";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionDetails } from "@/components/subscriptions/subscription-details";
import { QRCodeSection } from "@/components/payment/qr-code-section";
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaySubscription } from "@/hooks/usePaySubscription";

export default function SubscriptionPage() {
  const params = useParams();
  const subscriptionId = params.id as string;
  const { isConnected, address } = useAccount();
  const [copied, setCopied] = useState(false);

  const { subscription, loading, refetch } = useSubscription(subscriptionId);

  // Use the subscription_id_bytes32 from database (saved from on-chain creation)
  // Don't calculate from UUID - the contract generates a different ID
  const subscriptionIdBytes32 = subscription?.subscription_id_bytes32
    ? (subscription.subscription_id_bytes32.startsWith("0x")
        ? subscription.subscription_id_bytes32 as `0x${string}`
        : `0x${subscription.subscription_id_bytes32}` as `0x${string}`)
    : undefined;

  const {
    onChainSubscription,
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
    renewalFee,
    totalAmount,
    handleApprove,
    handlePaySubscription,
  } = usePaySubscription(subscription, subscriptionIdBytes32, () => {
    setTimeout(() => {
      refetch();
      const interval = setInterval(() => {
        refetch();
      }, 2000);
      setTimeout(() => clearInterval(interval), 10000);
    }, 500);
  });

  const copySubscriptionLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading subscription...</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Subscription not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscriptionUrl = typeof window !== "undefined" ? window.location.href : "";
  const nextPaymentDate = new Date(subscription.next_payment_due);
  const isPaymentDue = nextPaymentDate <= new Date();
  // Allow payment if: subscription is pending (first payment) OR payment is due
  const canMakePayment = subscription.status === "pending" || (subscription.status === "active" && isPaymentDue);

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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Subscription Details
            </h1>
            <p className="text-lg text-muted-foreground">
              View and manage your recurring subscription
            </p>
          </div>
          <Card className="border-2 shadow-xl bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="space-y-2 pb-8">
              <CardTitle className="text-2xl font-bold">Subscription Information</CardTitle>
              <CardDescription className="text-base">
                Review the subscription details and make payments when due
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <SubscriptionDetails subscription={subscription} />
                <QRCodeSection
                  qrCodeValue={subscriptionUrl}
                  copied={copied}
                  onCopy={copySubscriptionLink}
                />
              </div>

              {(subscription.status === "pending" || (subscription.status === "active" && canMakePayment)) && (
                <div className="border-t-2 border-border/60 pt-8 space-y-5">
                  <h3 className="text-xl font-bold">
                    {subscription.status === "pending"
                      ? "Make First Payment"
                      : "Pay Subscription"}
                  </h3>
                  {subscription.status === "pending" && (
                    <p className="text-sm text-muted-foreground">
                      This subscription is pending. Make your first payment to activate it.
                    </p>
                  )}
                  <SubscriptionActions
                    subscription={subscription}
                    isConnected={isConnected}
                    address={address}
                    onChainSubscription={onChainSubscription}
                    needsApproval={needsApproval}
                    isApproving={isApproving}
                    isApprovalConfirming={isApprovalConfirming}
                    isPaying={isPaying}
                    isPaymentConfirming={isPaymentConfirming}
                    subscriptionIdBytes32={subscriptionIdBytes32}
                    transferHash={transferHash}
                    isPayError={isPayError}
                    payError={payError}
                    isPaymentReceiptError={isPaymentReceiptError}
                    paymentReceiptError={paymentReceiptError}
                    renewalFee={renewalFee}
                    totalAmount={totalAmount}
                    onApprove={handleApprove}
                    onPay={handlePaySubscription}
                  />
                </div>
              )}

              {subscription.status !== "active" && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    This subscription is {subscription.status.replace(/_/g, " ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

