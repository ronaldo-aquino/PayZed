"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCCTPPayment, type CCTPPaymentStep } from "@/hooks/useCCTPPayment";
import { CCTP_SUPPORTED_CHAINS } from "@/lib/cctp-constants";
import type { Invoice } from "@backend/lib/supabase";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

interface CCTPPaymentModalProps {
  invoice: Invoice | null;
  invoiceIdBytes32: `0x${string}` | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess?: () => void;
}

const stepConfig: Record<CCTPPaymentStep, { label: string; description: (sourceChainName?: string) => string }> = {
  idle: { label: "Select Source Chain", description: () => "Choose the network to transfer USDC from" },
  approving: { label: "Approving USDC", description: () => "Approving USDC for cross-chain transfer..." },
  burning: { label: "Burning USDC", description: (sourceChainName) => sourceChainName ? `Burning USDC on ${sourceChainName}...` : "Burning USDC on source chain..." },
  waiting_attestation: { label: "Waiting for Attestation", description: () => "Waiting for Circle to verify the burn..." },
  minting: { label: "Minting USDC", description: () => "Minting USDC on Arc Testnet..." },
  paying: { label: "Completing Payment", description: () => "Finalizing invoice payment..." },
  success: { label: "Payment Successful", description: () => "Your payment has been completed!" },
  error: { label: "Payment Failed", description: () => "An error occurred during payment" },
};

export function CCTPPaymentModal({
  invoice,
  invoiceIdBytes32,
  open,
  onOpenChange,
  onPaymentSuccess,
}: CCTPPaymentModalProps) {
  const [selectedChainId, setSelectedChainId] = useState<number | "">("");

  const {
    step,
    error,
    sourceChainId,
    burnTxHash,
    mintTxHash,
    paymentTxHash,
    isUSDC,
    availableSourceChains,
    initiateCCTPPayment,
    canCompleteMint,
    completeMint,
    reset,
  } = useCCTPPayment(invoice, invoiceIdBytes32, () => {
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
    setTimeout(() => {
      onOpenChange(false);
    }, 2000);
  });

  const handleChainSelect = (chainId: number) => {
    setSelectedChainId(chainId);
    initiateCCTPPayment(chainId);
  };

  const handleClose = (open: boolean) => {
    if (!open && step !== "paying" && step !== "minting" && step !== "burning") {
      reset();
      setSelectedChainId("");
    }
    onOpenChange(open);
  };

  const getStepStatus = (stepName: CCTPPaymentStep, currentStep: CCTPPaymentStep) => {
    if (stepName === currentStep) {
      if (currentStep === "error") return "error";
      if (currentStep === "success") return "completed";
      return "active";
    }
    
    const stepOrder: CCTPPaymentStep[] = [
      "idle",
      "approving",
      "burning",
      "waiting_attestation",
      "minting",
      "paying",
      "success",
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepName);
    
    if (currentStep === "error" && stepIndex < currentIndex) return "completed";
    if (stepIndex < currentIndex || currentStep === "success") return "completed";
    return "pending";
  };

  const steps: CCTPPaymentStep[] = [
    "approving",
    "burning",
    "waiting_attestation",
    "minting",
    "paying",
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Pay with USDC from Another Chain</DialogTitle>
          <DialogDescription>
            Use Circle's CCTP to transfer USDC from another network to pay this invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === "idle" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="source-chain" className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Select source chain:
                </label>
                <Select
                  id="source-chain"
                  value={selectedChainId}
                  onChange={(e) => {
                    const chainId = Number(e.target.value);
                    if (chainId) {
                      handleChainSelect(chainId);
                    }
                  }}
                  className="w-full"
                >
                  <option value="">Choose a network to transfer USDC from...</option>
                  {availableSourceChains.map((chain) => (
                    <option key={chain.chainId} value={chain.chainId}>
                      {chain.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  All available CCTP-supported networks are listed above. USDC will be transferred to Arc Testnet.
                </p>
              </div>
            </div>
          )}

          {step !== "idle" && (
            <div className="space-y-6">
              <div className="space-y-4">
                {steps.map((stepName, index) => {
                  const status = getStepStatus(stepName, step);
                  const config = stepConfig[stepName];
                  const sourceChainName = sourceChainId ? CCTP_SUPPORTED_CHAINS[sourceChainId]?.name : undefined;
                  
                  return (
                    <div key={stepName} className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {status === "completed" ? (
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        ) : status === "active" ? (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        ) : status === "error" && stepName === step ? (
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center">
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-semibold ${
                            status === "active" ? "text-blue-600 dark:text-blue-400" :
                            status === "completed" ? "text-green-600 dark:text-green-400" :
                            status === "error" ? "text-red-600 dark:text-red-400" :
                            "text-muted-foreground"
                          }`}>
                            {config.label}
                          </p>
                          {status === "active" && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
                              In progress...
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{config.description(sourceChainName)}</p>
                        
                        {stepName === "burning" && burnTxHash && sourceChainId && (
                          <div className="mt-2 text-xs">
                            <a
                              href={`${CCTP_SUPPORTED_CHAINS[sourceChainId]?.blockExplorer}/tx/${burnTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                              View burn transaction
                            </a>
                          </div>
                        )}
                        {stepName === "minting" && mintTxHash && (
                          <div className="mt-2 text-xs">
                            <a
                              href={`https://testnet.arcscan.app/tx/${mintTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                              View mint transaction
                            </a>
                          </div>
                        )}
                        {stepName === "paying" && paymentTxHash && (
                          <div className="mt-2 text-xs">
                            <a
                              href={`https://testnet.arcscan.app/tx/${paymentTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                              View payment transaction
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && step === "error" && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300 break-words">{error}</p>
                  
                  {canCompleteMint && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                        ⚠ Your USDC was burned but not minted
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                        You can complete the mint and payment below.
                      </p>
                      <Button
                        onClick={completeMint}
                        className="w-full"
                        variant="outline"
                      >
                        Complete Mint & Pay
                      </Button>
                    </div>
                  )}
                  
                  {!canCompleteMint && (
                    <Button
                      onClick={() => {
                        reset();
                        handleClose(false);
                      }}
                      className="mt-3 w-full"
                      variant="ghost"
                    >
                      Start Over
                    </Button>
                  )}
                </div>
              )}

              {step === "success" && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    ✔ Payment completed successfully!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
