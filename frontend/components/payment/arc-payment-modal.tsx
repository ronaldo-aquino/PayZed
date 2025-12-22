"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Invoice } from "@backend/lib/supabase";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

interface ArcPaymentModalProps {
  invoice: Invoice | null;
  invoiceIdBytes32: `0x${string}` | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needsApproval: boolean;
  isApproving: boolean;
  isApprovalConfirming: boolean;
  isPaying: boolean;
  isPaymentConfirming: boolean;
  isPayError: boolean;
  payError: any;
  isPaymentReceiptError: boolean;
  paymentReceiptError: any;
  transferHash: `0x${string}` | undefined;
  onApprove: () => void;
  onPay: () => void;
  onPaymentSuccess?: () => void;
}

type PaymentStep = "approving" | "paying" | "success" | "error";

const stepConfig: Record<PaymentStep, { label: string; description: string }> = {
  approving: { label: "Approving Token", description: "Approving token for payment..." },
  paying: { label: "Processing Payment", description: "Finalizing invoice payment..." },
  success: { label: "Payment Successful", description: "Your payment has been completed!" },
  error: { label: "Payment Failed", description: "An error occurred during payment" },
};

export function ArcPaymentModal({
  invoice,
  invoiceIdBytes32,
  open,
  onOpenChange,
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
  onApprove,
  onPay,
  onPaymentSuccess,
}: ArcPaymentModalProps) {
  const getCurrentStep = (): PaymentStep => {
    if (transferHash) return "success";
    if (isPayError || isPaymentReceiptError) return "error";
    if (isPaying || isPaymentConfirming) return "paying";
    if (isApproving || isApprovalConfirming) return "approving";
    return needsApproval ? "approving" : "paying";
  };

  const currentStep = getCurrentStep();

  const getStepStatus = (stepName: PaymentStep) => {
    if (stepName === "approving") {
      if (isApproving || isApprovalConfirming) {
        return "active";
      }
      if (!needsApproval) {
        return "completed";
      }
      if (currentStep === "approving") {
        return "pending";
      }
      if (currentStep === "paying" || currentStep === "success") {
        return "completed";
      }
      return "pending";
    }
    
    if (stepName === "paying") {
      if (isPaying || isPaymentConfirming) {
        return "active";
      }
      if (currentStep === "success") {
        return "completed";
      }
      if (currentStep === "error") {
        return "error";
      }
      if (currentStep === "paying") {
        return "pending";
      }
      return "pending";
    }
    
    return "pending";
  };

  const steps: PaymentStep[] = ["approving", "paying"];

  const handleClose = (open: boolean) => {
    if (!open && currentStep !== "paying" && currentStep !== "approving") {
      if (onPaymentSuccess && currentStep === "success") {
        onPaymentSuccess();
      }
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Pay on Arc Network</DialogTitle>
          <DialogDescription>
            Complete your payment on the Arc Testnet network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-6">
            <div className="space-y-4">
              {steps.map((stepName) => {
                const status = getStepStatus(stepName);
                const config = stepConfig[stepName];
                
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
                      ) : status === "error" && stepName === currentStep ? (
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
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                      
                      {stepName === "paying" && transferHash && (
                        <div className="mt-2 text-xs">
                          <a
                            href={`https://testnet.arcscan.app/tx/${transferHash}`}
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

            {currentStep === "error" && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 break-words">
                {payError?.message ||
                  paymentReceiptError?.message ||
                  "Payment failed. Please try again."}
              </p>
            </div>
          )}

          {currentStep === "success" && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                ✔ Payment completed successfully!
              </p>
            </div>
          )}

          {currentStep !== "success" && currentStep !== "error" && (
            <div className="space-y-3 pt-4 border-t">
              {needsApproval && currentStep === "approving" && (
                <Button
                  onClick={onApprove}
                  disabled={isApproving || isApprovalConfirming}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {isApproving || isApprovalConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    `Approve ${invoice?.currency || ""}`
                  )}
                </Button>
              )}

              {(!needsApproval || currentStep === "paying") && (
                <Button
                  onClick={onPay}
                  disabled={isPaying || isPaymentConfirming || !invoiceIdBytes32}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {isPaying || isPaymentConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    `Pay ${invoice?.amount || ""} ${invoice?.currency || ""}`
                  )}
                </Button>
              )}
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

