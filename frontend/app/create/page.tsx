"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/create-invoice/invoice-form";
import { FeeDisplay } from "@/components/create-invoice/fee-display";
import { TransactionStatus } from "@/components/create-invoice/transaction-status";
import { ErrorDisplay } from "@/components/create-invoice/error-display";
import {
  PAYZED_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  EURC_CONTRACT_ADDRESS,
} from "@/lib/constants";
import { useInvoiceForm } from "@/hooks/useInvoiceForm";
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useCreateInvoice } from "@/hooks/useCreateInvoice";

export default function CreateInvoicePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const { register, handleSubmit, errors, isSubmitting, watchAmount, watchCurrency, feeAmount } =
    useInvoiceForm();

  const tokenAddress =
    watchCurrency === "USDC"
      ? USDC_CONTRACT_ADDRESS
      : watchCurrency === "EURC"
        ? EURC_CONTRACT_ADDRESS
        : undefined;
  const feeAmountInWei =
    watchAmount && !isNaN(watchAmount) && watchAmount > 0 && tokenAddress
      ? parseUnits((watchAmount * 0.0005).toString(), 6)
      : undefined;

  const {
    allowance,
    needsApproval,
    isLoadingAllowance,
    allowanceError,
    isAllowanceSuccess,
    handleApprove,
    isApproving,
    isApprovalConfirming,
    refetchAllowance,
  } = useTokenAllowance(address, tokenAddress, feeAmountInWei);

  const { balance } = useTokenBalance(address, tokenAddress);

  const {
    createInvoice,
    isCreatingOnChain,
    isWaitingForTx,
    isPendingWrite,
    error,
    dbSaveError,
    retryDatabaseSave,
    createTxHash,
  } = useCreateInvoice();

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/login");
    }
  }, [isConnected, address, router]);

  const onSubmit = async (data: any) => {
    const balanceBigInt =
      balance !== undefined && typeof balance === "bigint" ? balance : undefined;
    await createInvoice(data, needsApproval, feeAmountInWei, balanceBigInt);
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
              Create New Invoice
            </h1>
            <p className="text-lg text-muted-foreground">
              Create an invoice to receive payments in USDC or EURC
            </p>
          </div>
          <Card className="w-full border-2 shadow-xl bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="space-y-2 pb-8">
              <CardTitle className="text-2xl font-bold">Invoice Details</CardTitle>
              <CardDescription className="text-base">
                Fill in the information below to create your invoice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <InvoiceForm register={register} errors={errors} />

                {watchAmount &&
                  !isNaN(watchAmount) &&
                  watchAmount > 0 &&
                  watchCurrency &&
                  feeAmount > 0 && (
                    <FeeDisplay
                      feeAmount={feeAmount}
                      currency={watchCurrency}
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
                      refetchAllowance={refetchAllowance}
                    />
                  )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                  disabled={isSubmitting || isCreatingOnChain || isWaitingForTx || isPendingWrite || needsApproval}
                >
                  {isPendingWrite || isCreatingOnChain || isWaitingForTx
                    ? "Creating invoice..."
                    : isSubmitting
                      ? "Creating invoice..."
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

                {!PAYZED_CONTRACT_ADDRESS && (
                  <p className="text-sm text-destructive text-center">
                    Contract address not configured. Please set NEXT_PUBLIC_PAYZED_CONTRACT_ADDRESS
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
