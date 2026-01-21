"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCCTPTransfer, type CCTPTransferStep } from "@/hooks/useCCTPTransfer";
import { CCTP_SUPPORTED_CHAINS } from "@/lib/cctp-constants";
import { CheckCircle2, Circle, Loader2, XCircle, ArrowRight } from "lucide-react";

export const dynamic = 'force-dynamic';

const stepConfig: Record<CCTPTransferStep, { label: string; description: (sourceChainName?: string) => string }> = {
  idle: { label: "Ready", description: () => "Enter amount and select source chain" },
  approving: { label: "Approving USDC", description: () => "Approving USDC for cross-chain transfer..." },
  burning: { label: "Burning USDC", description: (sourceChainName) => sourceChainName ? `Burning USDC on ${sourceChainName}...` : "Burning USDC on source chain..." },
  waiting_attestation: { label: "Waiting for Attestation", description: () => "Waiting for Circle to verify the burn..." },
  minting: { label: "Minting USDC", description: () => "Minting USDC on Arc Testnet..." },
  success: { label: "Transfer Successful", description: () => "Your USDC has been transferred to Arc Testnet!" },
  error: { label: "Transfer Failed", description: () => "An error occurred during transfer" },
};

export default function BringUSDCPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [selectedChainId, setSelectedChainId] = useState<number | "">("");

  const {
    step,
    error,
    sourceChainId,
    burnTxHash,
    mintTxHash,
    availableSourceChains,
    initiateTransfer,
    canCompleteMint,
    completeMint,
    reset,
  } = useCCTPTransfer();

  if (!isConnected || !address) {
    router.push("/login");
    return null;
  }

  const handleTransfer = () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }
    if (selectedChainId === "" || !selectedChainId) {
      return;
    }
    initiateTransfer(selectedChainId, amount);
  };

  const getStepStatus = (stepName: CCTPTransferStep, currentStep: CCTPTransferStep) => {
    if (stepName === currentStep) {
      if (currentStep === "error") return "error";
      if (currentStep === "success") return "completed";
      return "active";
    }
    
    const stepOrder: CCTPTransferStep[] = [
      "idle",
      "approving",
      "burning",
      "waiting_attestation",
      "minting",
      "success",
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepName);
    
    if (currentStep === "error" && stepIndex < currentIndex) return "completed";
    if (stepIndex < currentIndex || currentStep === "success") return "completed";
    return "pending";
  };

  const steps: CCTPTransferStep[] = [
    "approving",
    "burning",
    "waiting_attestation",
    "minting",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-3 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ArrowRight className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Bring USDC to Arc Testnet
            </h1>
            <p className="text-lg text-muted-foreground">
              Transfer USDC from another network to Arc Testnet using Circle's CCTP
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transfer USDC</CardTitle>
              <CardDescription>
                Select a source network and enter the amount you want to transfer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === "idle" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USDC)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.000001"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={step !== "idle"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source-chain">Source Chain</Label>
                    <select
                      id="source-chain"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedChainId}
                      onChange={(e) => setSelectedChainId(Number(e.target.value) || "")}
                      disabled={step !== "idle"}
                    >
                      <option value="">Choose a network to transfer USDC from...</option>
                      {availableSourceChains.map((chain) => (
                        <option key={chain.chainId} value={chain.chainId}>
                          {chain.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      ⚠️ Important: Gas Requirements
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li><strong>Source Chain:</strong> You need native tokens (ETH) on the source network for burn transaction gas fees.</li>
                      <li><strong>Arc Testnet:</strong> You need USDC on Arc Testnet for mint transaction gas fees.</li>
                      <li>Make sure you have sufficient balances on both networks before starting the transfer.</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleTransfer}
                    disabled={!amount || parseFloat(amount) <= 0 || selectedChainId === "" || !selectedChainId}
                    className="w-full"
                    size="lg"
                  >
                    Start Transfer
                  </Button>
                </>
              )}

              {step !== "idle" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {steps.map((stepName) => {
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
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {error && step === "error" && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">Error</p>
                      <p className="text-sm text-red-700 dark:text-red-300 break-words whitespace-pre-line">{error}</p>
                      
                      {canCompleteMint && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                            ⚠ Your USDC was burned but not minted
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                            You can complete the mint below.
                          </p>
                          <Button
                            onClick={completeMint}
                            className="w-full"
                            variant="outline"
                          >
                            Complete Mint
                          </Button>
                        </div>
                      )}
                      
                      {!canCompleteMint && (
                        <Button
                          onClick={() => {
                            reset();
                            setAmount("");
                            setSelectedChainId("");
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
                      <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                        ✔ Transfer completed successfully!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Your USDC has been transferred to Arc Testnet. You can now use it for payments.
                      </p>
                      <Button
                        onClick={() => {
                          reset();
                          setAmount("");
                          setSelectedChainId("");
                        }}
                        className="mt-4 w-full"
                        variant="outline"
                      >
                        Transfer More USDC
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

