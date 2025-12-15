"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/create-invoice/invoice-form";
import { SubscriptionForm } from "@/components/create-invoice/subscription-form";
import { FeeDisplay } from "@/components/create-invoice/fee-display";
import { TransactionStatus } from "@/components/create-invoice/transaction-status";
import { ErrorDisplay } from "@/components/create-invoice/error-display";
import { TypeSelector } from "@/components/create-invoice/type-selector";
import {
  INVOPAY_CONTRACT_ADDRESS,
  INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  EURC_CONTRACT_ADDRESS,
} from "@/lib/constants";
import { useInvoiceForm } from "@/hooks/useInvoiceForm";
import { useSubscriptionForm } from "@/hooks/useSubscriptionForm";
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useCreateInvoice } from "@/hooks/useCreateInvoice";
import { useCreateSubscription } from "@/hooks/useCreateSubscription";

type InvoiceType = "one-time" | "recurring";

export default function CreateInvoicePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("one-time");

  const invoiceForm = useInvoiceForm();
  const subscriptionForm = useSubscriptionForm();

  const invoiceRegister = invoiceForm.register;
  const subscriptionRegister = subscriptionForm.register;
  const invoiceErrors = invoiceForm.errors;
  const subscriptionErrors = subscriptionForm.errors;
  const invoiceHandleSubmit = invoiceForm.handleSubmit;
  const subscriptionHandleSubmit = subscriptionForm.handleSubmit;
  const invoiceIsSubmitting = invoiceForm.isSubmitting;
  const subscriptionIsSubmitting = subscriptionForm.isSubmitting;
  
  const activeWatchAmount = invoiceType === "one-time" ? invoiceForm.watchAmount : subscriptionForm.watchAmount;
  const activeWatchCurrency = invoiceType === "one-time" ? invoiceForm.watchCurrency : subscriptionForm.watchCurrency;
  const activeFeeAmount = invoiceType === "one-time" ? invoiceForm.feeAmount : subscriptionForm.feeAmount;

  const tokenAddress =
    activeWatchCurrency === "USDC"
      ? USDC_CONTRACT_ADDRESS
      : activeWatchCurrency === "EURC"
        ? EURC_CONTRACT_ADDRESS
        : undefined;
  const feeAmountInWei =
    activeWatchAmount && !isNaN(activeWatchAmount) && activeWatchAmount > 0 && tokenAddress
      ? parseUnits((activeWatchAmount * 0.0005).toString(), 6)
      : undefined;

  const contractAddressForAllowance = invoiceType === "one-time" 
    ? INVOPAY_CONTRACT_ADDRESS 
    : INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS;

  const {
    allowance,
    needsApproval,
    isLoadingAllowance,
    allowanceError,
    isAllowanceSuccess,
    handleApprove,
    isApproving,
    isApprovalConfirming,
  } = useTokenAllowance(address, tokenAddress, feeAmountInWei, contractAddressForAllowance);

  const { balance } = useTokenBalance(address, tokenAddress);

  const invoiceHook = useCreateInvoice();
  const subscriptionHook = useCreateSubscription();

  const {
    createInvoice,
    isCreatingOnChain: isCreatingInvoice,
    isWaitingForTx: isWaitingInvoice,
    error: invoiceError,
    dbSaveError: invoiceDbError,
    retryDatabaseSave: retryInvoiceSave,
    createTxHash: invoiceTxHash,
  } = invoiceHook;

  const {
    createSubscription,
    isCreatingOnChain: isCreatingSubscription,
    isWaitingForTx: isWaitingSubscription,
    error: subscriptionError,
    dbSaveError: subscriptionDbError,
    retryDatabaseSave: retrySubscriptionSave,
    createTxHash: subscriptionTxHash,
  } = subscriptionHook;

  const isCreatingOnChain = invoiceType === "one-time" ? isCreatingInvoice : isCreatingSubscription;
  const isWaitingForTx = invoiceType === "one-time" ? isWaitingInvoice : isWaitingSubscription;
  const error = invoiceType === "one-time" ? invoiceError : subscriptionError;
  const dbSaveError = invoiceType === "one-time" ? invoiceDbError : subscriptionDbError;
  const retryDatabaseSave = invoiceType === "one-time" ? retryInvoiceSave : retrySubscriptionSave;
  const createTxHash = invoiceType === "one-time" ? invoiceTxHash : subscriptionTxHash;

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/login");
    }
  }, [isConnected, address, router]);

  const onSubmit = async (data: any) => {
    const balanceBigInt =
      balance !== undefined && typeof balance === "bigint" ? balance : undefined;
    
    if (invoiceType === "one-time") {
      await createInvoice(data, needsApproval, feeAmountInWei, balanceBigInt);
    } else {
      await createSubscription(data, needsApproval, feeAmountInWei, balanceBigInt);
    }
  };

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto space-y-8">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Create New {invoiceType === "one-time" ? "Invoice" : "Subscription"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {invoiceType === "one-time"
                ? "Create an invoice to receive a one-time payment in USDC or EURC"
                : "Create a recurring subscription to receive periodic payments in USDC or EURC"}
            </p>
          </div>
          <Card className="w-full border-2 shadow-xl bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="space-y-4 pb-8">
              <div>
                <CardTitle className="text-2xl font-bold mb-2">Payment Type</CardTitle>
                <TypeSelector selectedType={invoiceType} onTypeChange={setInvoiceType} />
              </div>
              <div className="pt-4">
                <CardTitle className="text-2xl font-bold">
                  {invoiceType === "one-time" ? "Invoice" : "Subscription"} Details
                </CardTitle>
                <CardDescription className="text-base">
                  Fill in the information below to create your {invoiceType === "one-time" ? "invoice" : "subscription"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {invoiceType === "one-time" ? (
                <form onSubmit={invoiceHandleSubmit(onSubmit)} className="space-y-6">
                  <InvoiceForm register={invoiceRegister} errors={invoiceErrors} />

                {activeWatchAmount &&
                  !isNaN(activeWatchAmount) &&
                  activeWatchAmount > 0 &&
                  activeWatchCurrency &&
                  activeFeeAmount > 0 && (
                    <FeeDisplay
                      feeAmount={activeFeeAmount}
                      currency={activeWatchCurrency}
                      tokenAddress={tokenAddress}
                      needsApproval={needsApproval}
                      isLoadingAllowance={isLoadingAllowance}
                      allowanceError={allowanceError}
                      isAllowanceSuccess={isAllowanceSuccess}
                      allowance={allowance}
                      feeAmountInWei={feeAmountInWei}
                      isApproving={isApproving}
                      isApprovalConfirming={isApprovalConfirming}
                      onApprove={handleApprove}
                    />
                  )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                  disabled={invoiceIsSubmitting || isCreatingOnChain || isWaitingForTx || needsApproval}
                >
                  {isCreatingOnChain || isWaitingForTx
                    ? "Waiting for transaction confirmation..."
                    : invoiceIsSubmitting
                      ? "Creating..."
                      : "Create Invoice"}
                </Button>

                <ErrorDisplay
                  error={error}
                  dbSaveError={dbSaveError}
                  isCreatingOnChain={isCreatingOnChain}
                  onRetry={retryDatabaseSave}
                />

                <TransactionStatus
                  isCreatingOnChain={isCreatingOnChain}
                  isWaitingForTx={isWaitingForTx}
                  createTxHash={createTxHash}
                />

                  {!INVOPAY_CONTRACT_ADDRESS && (
                    <p className="text-sm text-destructive text-center">
                      Contract address not configured. Please set NEXT_PUBLIC_INVOPAY_CONTRACT_ADDRESS
                    </p>
                  )}
                </form>
              ) : (
                <form onSubmit={subscriptionHandleSubmit(onSubmit)} className="space-y-6">
                  <SubscriptionForm register={subscriptionRegister} errors={subscriptionErrors} />

                  {activeWatchAmount &&
                    !isNaN(activeWatchAmount) &&
                    activeWatchAmount > 0 &&
                    activeWatchCurrency &&
                    activeFeeAmount > 0 && (
                      <FeeDisplay
                        feeAmount={activeFeeAmount}
                        currency={activeWatchCurrency}
                        tokenAddress={tokenAddress}
                        needsApproval={needsApproval}
                        isLoadingAllowance={isLoadingAllowance}
                        allowanceError={allowanceError}
                        isAllowanceSuccess={isAllowanceSuccess}
                        allowance={allowance}
                        feeAmountInWei={feeAmountInWei}
                        isApproving={isApproving}
                        isApprovalConfirming={isApprovalConfirming}
                        onApprove={handleApprove}
                      />
                    )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    size="lg"
                    disabled={subscriptionIsSubmitting || isCreatingOnChain || isWaitingForTx || needsApproval}
                  >
                    {isCreatingOnChain || isWaitingForTx
                      ? "Waiting for transaction confirmation..."
                      : subscriptionIsSubmitting
                        ? "Creating..."
                        : "Create Subscription"}
                  </Button>

                  <ErrorDisplay
                    error={error}
                    dbSaveError={dbSaveError}
                    isCreatingOnChain={isCreatingOnChain}
                    onRetry={retryDatabaseSave}
                  />

                  <TransactionStatus
                    isCreatingOnChain={isCreatingOnChain}
                    isWaitingForTx={isWaitingForTx}
                    createTxHash={createTxHash}
                  />

                  {!INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS && (
                    <p className="text-sm text-destructive text-center">
                      Subscription contract address not configured. Please set NEXT_PUBLIC_INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS
                    </p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
