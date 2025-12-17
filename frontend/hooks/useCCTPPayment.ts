import { useState, useEffect } from "react";
import { useAccount, useWalletClient, usePublicClient, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi";
import { burnUSDC, fetchAttestation } from "@/lib/services/cctp.service";
import { CCTP_SUPPORTED_CHAINS } from "@/lib/cctp-constants";
import { ARC_TESTNET_CHAIN_ID, INVOPAY_CONTRACT_ADDRESS } from "@/lib/constants";
import { INVOPAY_ABI } from "@/lib/contract-abi";
import { MESSAGE_TRANSMITTER_ABI } from "@/lib/services/cctp.service";
import { getTransactionReceipt, calculateGasCost } from "@backend/lib/services/contract.service";
import { updateInvoicePayment } from "@backend/lib/services/invoice-db.service";
import { arcTestnet } from "@/lib/wagmi";
import type { Invoice } from "@backend/lib/supabase";

export type CCTPPaymentStep =
  | "idle"
  | "approving"
  | "burning"
  | "waiting_attestation"
  | "minting"
  | "paying"
  | "success"
  | "error";

export function useCCTPPayment(
  invoice: Invoice | null,
  invoiceIdBytes32: `0x${string}` | undefined,
  onPaymentSuccess?: () => void
) {
  const { address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [step, setStep] = useState<CCTPPaymentStep>("idle");
  const [sourceChainId, setSourceChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [burnTxHash, setBurnTxHash] = useState<`0x${string}` | null>(null);
  const [mintTxHash, setMintTxHash] = useState<`0x${string}` | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<`0x${string}` | null>(null);
  const [savedBurnResult, setSavedBurnResult] = useState<{ message: `0x${string}`; messageHash: `0x${string}`; attestation?: string; burnTxHash: `0x${string}`; sourceChainId: number } | null>(null);

  const isUSDC = invoice?.currency === "USDC";
  const destinationChainId = ARC_TESTNET_CHAIN_ID;
  
  const arcPublicClient = usePublicClient({ chainId: destinationChainId });

  const {
    writeContract: writePayInvoice,
    data: payTxHash,
    isPending: isPayingInvoice,
    error: payInvoiceError,
  } = useWriteContract();

  const {
    writeContract: writeMint,
    data: mintTxHashFromHook,
    isPending: isMinting,
    error: mintError,
  } = useWriteContract();

  const {
    isLoading: isWaitingForMint,
    data: mintReceipt,
    error: mintReceiptError,
  } = useWaitForTransactionReceipt({
    hash: mintTxHashFromHook,
    query: {
      enabled: !!mintTxHashFromHook,
    },
  });

  const { 
    isLoading: isWaitingForPayment,
    data: paymentReceipt,
    error: paymentReceiptError,
  } = useWaitForTransactionReceipt({
    hash: payTxHash,
    query: {
      enabled: !!payTxHash,
    },
  });

  useEffect(() => {
    if (payInvoiceError) {
      const errorMsg = (payInvoiceError as any)?.message || String(payInvoiceError) || "Unknown error";
      setError(`Failed to send payment transaction: ${errorMsg}`);
      setStep("error");
    }
  }, [payInvoiceError]);

  useEffect(() => {
    if (paymentReceiptError) {
      const errorMsg = (paymentReceiptError as any)?.message || String(paymentReceiptError) || "Unknown error";
      setError(`Failed to confirm payment: ${errorMsg}`);
      setStep("error");
    }
  }, [paymentReceiptError]);

  useEffect(() => {
    if (mintTxHashFromHook && step === "minting") {
      setMintTxHash(mintTxHashFromHook);
    }
  }, [mintTxHashFromHook, step]);

  useEffect(() => {
    if (mintReceipt && step === "minting") {
      if (mintReceipt.status === "success") {
        setMintTxHash(mintReceipt.transactionHash);
        
        setTimeout(async () => {
          setStep("paying");

          if (!invoiceIdBytes32 || !INVOPAY_CONTRACT_ADDRESS) {
            setError("Invoice ID or contract address not found. Cannot pay invoice.");
            setStep("error");
            return;
          }

          try {
            await checkInvoiceStatusBeforePayment();
          } catch (checkError: any) {
            setError(checkError.message);
            setStep("error");
            return;
          }
          
          try {
            writePayInvoice({
              address: INVOPAY_CONTRACT_ADDRESS as `0x${string}`,
              abi: INVOPAY_ABI,
              functionName: "payInvoice",
              args: [invoiceIdBytes32],
            });
          } catch (payError: any) {
            setError(`Failed to send payment transaction: ${payError?.message || 'Unknown error'}`);
            setStep("error");
          }
        }, 2000);
      } else {
        setError("Mint transaction failed");
        setStep("error");
      }
    }
  }, [mintReceipt, step, invoiceIdBytes32, writePayInvoice, publicClient]);

  useEffect(() => {
    if (mintError && step === "minting") {
      const errorMsg = (mintError as any)?.message || (mintError as any)?.shortMessage || String(mintError) || "Unknown error";
      
      if (errorMsg.includes("chain") || errorMsg.includes("ChainMismatch") || errorMsg.includes("does not match") || errorMsg.includes("current chain") || errorMsg.includes("target chain")) {
        setError(`CHAIN ERROR: Your wallet must be on Arc Testnet (chain ID ${destinationChainId}) to mint. Please manually switch your wallet to Arc Testnet and click "Complete Mint & Pay" again.`);
      } else {
        setError(`Failed to send mint transaction: ${errorMsg}. Please verify you are on Arc Testnet and have sufficient gas.`);
      }
      setStep("error");
    }
  }, [mintError, step, destinationChainId]);

  useWatchContractEvent({
    address: INVOPAY_CONTRACT_ADDRESS as `0x${string}`,
    abi: INVOPAY_ABI,
    eventName: "InvoicePaid",
    onLogs: async (logs) => {
      const relevantLog = logs.find(
        (log) => log.args.invoiceId?.toLowerCase() === invoiceIdBytes32?.toLowerCase()
      );
      if (relevantLog && invoice) {
        const payerAddress = relevantLog.args.payer;
        if (!payerAddress) return;

        const payerAddressLower = String(payerAddress).toLowerCase();

        let paymentGasCost: number | undefined = undefined;
        try {
          if (relevantLog.transactionHash && publicClient) {
            const receipt = await getTransactionReceipt(relevantLog.transactionHash);
            paymentGasCost = calculateGasCost(receipt);
          }
        } catch (error) {
        }

        try {
          await updateInvoicePayment(
            invoice.id,
            relevantLog.transactionHash || "",
            payerAddressLower,
            paymentGasCost
          );
          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
        } catch (updateError) {
        }
      }
    },
  });

  useEffect(() => {
    if (paymentReceipt && step === "paying") {
      if (paymentReceipt.status === "success") {
        setPaymentTxHash(paymentReceipt.transactionHash);
        setStep("success");
        
        (async () => {
          try {
            if (!invoice || !address) {
              return;
            }
            
            const payerAddress = address.toLowerCase();
            
            let paymentGasCost: number | undefined = undefined;
            try {
              paymentGasCost = calculateGasCost(paymentReceipt);
            } catch (error) {
            }
            
            await updateInvoicePayment(
              invoice.id,
              paymentReceipt.transactionHash,
              payerAddress,
              paymentGasCost
            );
            
            if (onPaymentSuccess) {
              onPaymentSuccess();
            }
          } catch (updateError: any) {
            if (onPaymentSuccess) {
              setTimeout(() => {
                onPaymentSuccess();
              }, 1000);
            }
          }
        })();
      } else {
        setError("Payment transaction failed");
        setStep("error");
      }
    }
  }, [paymentReceipt, step, onPaymentSuccess, invoice, address, invoiceIdBytes32, publicClient]);

  const checkInvoiceStatusBeforePayment = async (): Promise<void> => {
    if (!invoiceIdBytes32 || !INVOPAY_CONTRACT_ADDRESS) {
      throw new Error("Invoice ID or contract address not found.");
    }
    
    try {
      const { createPublicClient, http } = await import("viem");
      const { CCTP_SUPPORTED_CHAINS } = await import("@/lib/cctp-constants");
      const arcConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];
      
      const arcPublicClient = createPublicClient({
        chain: arcTestnet,
        transport: http(arcConfig.rpcUrl, {
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        }),
      });
      
      const onChainInvoice = await arcPublicClient.readContract({
        address: INVOPAY_CONTRACT_ADDRESS as `0x${string}`,
        abi: INVOPAY_ABI,
        functionName: "getInvoice",
        args: [invoiceIdBytes32],
      });
      
      if (onChainInvoice.status !== 0) {
        const statusNames = ["Pending", "Paid", "Expired", "Cancelled"];
        const statusName = statusNames[onChainInvoice.status] || "Unknown";
        throw new Error(`Invoice is not pending. Current status: ${statusName} (${onChainInvoice.status}). The invoice may have already been paid, cancelled, or expired.`);
      }
    } catch (checkError: any) {
      if (checkError.message.includes("Invoice is not pending")) {
        throw checkError;
      }
      throw new Error(`Failed to verify invoice status: ${checkError?.message || 'Unknown error'}. The invoice may not exist on the contract yet.`);
    }
  };

  const availableSourceChains = Object.values(CCTP_SUPPORTED_CHAINS).filter(
    (chain) => chain.chainId !== destinationChainId
  );

  const initiateCCTPPayment = async (selectedSourceChainId: number) => {
    if (!invoice || !invoiceIdBytes32 || !address || !walletClient) {
      setError("Missing required parameters");
      return;
    }

    if (!isUSDC) {
      setError("CCTP is only available for USDC payments");
      return;
    }

    setSourceChainId(selectedSourceChainId);
    setError(null);
    setStep("approving");

    try {
      const sourceConfig = CCTP_SUPPORTED_CHAINS[selectedSourceChainId];
      if (!sourceConfig) {
        throw new Error("Unsupported source chain");
      }

      if (publicClient?.chain?.id !== selectedSourceChainId && switchChainAsync) {
        await switchChainAsync({ chainId: selectedSourceChainId });
      }

      const amount = invoice.amount.toString();

      setStep("burning");
      const burnResult = await burnUSDC(
        selectedSourceChainId,
        destinationChainId,
        amount,
        address,
        address,
        walletClient
      );

      setBurnTxHash(burnResult.burnTxHash);
      setSavedBurnResult({ 
        message: burnResult.message, 
        messageHash: burnResult.messageHash,
        attestation: burnResult.attestation,
        burnTxHash: burnResult.burnTxHash,
        sourceChainId: selectedSourceChainId
      });

      let attestation = burnResult.attestation;
      if (!attestation) {
        setStep("waiting_attestation");
        const sourceConfig = CCTP_SUPPORTED_CHAINS[selectedSourceChainId];
        attestation = await fetchAttestation(
          burnResult.messageHash, 
          true,
          burnResult.burnTxHash,
          sourceConfig?.domain
        );
      }

      let currentChainId: number | undefined;
      try {
        if (walletClient) {
          currentChainId = await walletClient.getChainId();
        } else {
          currentChainId = chain?.id;
        }
      } catch (err) {
        currentChainId = chain?.id;
      }
      
      if (currentChainId !== destinationChainId) {
        if (switchChainAsync) {
          setStep("waiting_attestation");
          try {
            await switchChainAsync({ chainId: destinationChainId });
            
            let attempts = 0;
            const maxAttempts = 60;
            while (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              
              try {
                if (walletClient) {
                  currentChainId = await walletClient.getChainId();
                } else {
                  currentChainId = chain?.id;
                }
              } catch (err) {
                currentChainId = chain?.id;
              }
              
              if (currentChainId === destinationChainId) {
                setError(null);
                break;
              }
              attempts++;
            }
            
            if (currentChainId !== destinationChainId) {
              const errorMsg = `Chain switch was not confirmed after ${maxAttempts} attempts (30 seconds). Your wallet is still on chain ${currentChainId} (Sepolia), but needs to be on ${destinationChainId} (Arc Testnet).\n\nPlease manually switch your wallet to Arc Testnet in your wallet (Rabby/MetaMask) and try again.`;
              setError(errorMsg);
              setStep("error");
              throw new Error(errorMsg);
            }
          } catch (switchError: any) {
            if (switchError.message.includes("Chain switch was not confirmed")) {
              throw switchError;
            }
            throw new Error(`Failed to switch to Arc Testnet automatically.\n\nPlease manually switch your wallet to Arc Testnet (chain ID ${destinationChainId}) in your wallet and try again.`);
          }
        } else {
          throw new Error(`Cannot switch chain automatically.\n\nPlease manually switch your wallet to Arc Testnet (chain ID ${destinationChainId}) in your wallet before attempting payment.`);
        }
      } else {
        setError(null);
      }
      
      let finalChainCheck: number | undefined;
      try {
        if (walletClient) {
          finalChainCheck = await walletClient.getChainId();
        } else {
          finalChainCheck = chain?.id;
        }
      } catch (err) {
        finalChainCheck = chain?.id;
      }
      
      if (finalChainCheck !== destinationChainId) {
        const errorMsg = `CRITICAL ERROR: Your wallet is not on Arc Testnet.\n\nCurrent chain: ${finalChainCheck} (Sepolia)\nRequired chain: ${destinationChainId} (Arc Testnet)\n\nPlease manually switch your wallet to Arc Testnet in your wallet (Rabby/MetaMask) and try again.`;
        setError(errorMsg);
        setStep("error");
        throw new Error(errorMsg);
      }
      
      setError(null);

      const destConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];
      if (!destConfig) {
        throw new Error(`Destination chain configuration not found. Chain ID: ${destinationChainId}`);
      }

      if (!attestation || !attestation.startsWith('0x') || attestation.length < 10) {
        throw new Error(`Invalid attestation format: ${attestation?.substring(0, 50)}...`);
      }

      if (!burnResult.message || !burnResult.message.startsWith('0x') || burnResult.message.length < 10) {
        throw new Error(`Invalid message format: ${burnResult.message?.substring(0, 50)}...`);
      }
      
      const lastChainCheck = chain?.id;
      if (lastChainCheck !== destinationChainId) {
        throw new Error(`ERROR: Your wallet is not on Arc Testnet. Current chain: ${lastChainCheck}, required: ${destinationChainId}. Please manually switch your wallet to Arc Testnet and try again.`);
      }
      
      if (!walletClient) {
        throw new Error("Wallet client not available. Please connect your wallet.");
      }
      
      setStep("minting");
      
      try {
        const mintHash = await walletClient.writeContract({
          address: destConfig.messageTransmitter as `0x${string}`,
          abi: MESSAGE_TRANSMITTER_ABI,
          functionName: "receiveMessage",
          args: [burnResult.message, attestation as `0x${string}`],
        });
        
        setMintTxHash(mintHash);
        
        const { createPublicClient, http } = await import("viem");
        const { CCTP_SUPPORTED_CHAINS } = await import("@/lib/cctp-constants");
        const arcConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];
        
        const arcPublicClient = createPublicClient({
          chain: arcTestnet,
          transport: http(arcConfig.rpcUrl, {
            timeout: 30000,
            retryCount: 3,
            retryDelay: 1000,
          }),
        });
        
        const receipt = await arcPublicClient.waitForTransactionReceipt({ 
          hash: mintHash,
          timeout: 120000,
        });
        
        if (receipt.status === "success") {
          setStep("paying");
          
          if (!invoiceIdBytes32 || !INVOPAY_CONTRACT_ADDRESS) {
            setError("Invoice ID or contract address not found. Cannot pay invoice.");
            setStep("error");
            return;
          }
          
          try {
            await checkInvoiceStatusBeforePayment();
          } catch (checkError: any) {
            setError(checkError.message);
            setStep("error");
            return;
          }
          
          writePayInvoice({
            address: INVOPAY_CONTRACT_ADDRESS as `0x${string}`,
            abi: INVOPAY_ABI,
            functionName: "payInvoice",
            args: [invoiceIdBytes32],
          });
        } else {
          throw new Error("Mint transaction failed");
        }
      } catch (mintError: any) {
        const errorMsg = mintError?.message || mintError?.shortMessage || "Unknown error";
        
        if (errorMsg.includes("chain") || errorMsg.includes("ChainMismatch") || errorMsg.includes("does not match")) {
          setError(`CHAIN ERROR: Your wallet must be on Arc Testnet (chain ID ${destinationChainId}) to mint. Please manually switch your wallet to Arc Testnet and try again.`);
        } else {
          setError(`Failed to mint: ${errorMsg}. Please verify you are on Arc Testnet and have sufficient USDC for gas.`);
        }
        setStep("error");
      }
    } catch (err: any) {
      let errorMessage = "CCTP payment failed";
      
      if (err?.message) {
        if (err.message.includes("User rejected")) {
          errorMessage = "Transaction was rejected. Please try again.";
        } else if (err.message.includes("insufficient funds") || err.message.includes("insufficient balance")) {
          errorMessage = "Insufficient balance. Please ensure you have enough USDC.";
        } else if (err.message.includes("network") || err.message.includes("chain")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (err.message.length > 100) {
          errorMessage = err.message.substring(0, 100) + "...";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setStep("error");
    }
  };

  const completeMint = async () => {
    if (!savedBurnResult || !address || !walletClient) {
      setError("Burn data not found. Please start the payment process again.");
      return;
    }

    setError(null);

    try {
      let currentChainId: number | undefined;
      try {
        if (walletClient) {
          currentChainId = await walletClient.getChainId();
        } else {
          currentChainId = chain?.id;
        }
      } catch (err) {
        currentChainId = chain?.id;
      }
      
      if (currentChainId !== destinationChainId) {
        if (switchChainAsync) {
          setStep("waiting_attestation");
          try {
            await switchChainAsync({ chainId: destinationChainId });
            
            let attempts = 0;
            const maxAttempts = 60;
            while (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              
              try {
                if (walletClient) {
                  currentChainId = await walletClient.getChainId();
                } else {
                  currentChainId = chain?.id;
                }
              } catch (err) {
                currentChainId = chain?.id;
              }
              
              if (currentChainId === destinationChainId) {
                setError(null);
                break;
              }
              attempts++;
            }
            
            if (currentChainId !== destinationChainId) {
              const errorMsg = `Chain switch was not confirmed after ${maxAttempts} attempts (30 seconds). Your wallet is still on chain ${currentChainId} (Sepolia), but needs to be on ${destinationChainId} (Arc Testnet).\n\nPlease manually switch your wallet to Arc Testnet in your wallet (Rabby/MetaMask) and click "Complete Mint & Pay" again.`;
              setError(errorMsg);
              setStep("error");
              throw new Error(errorMsg);
            }
          } catch (switchError: any) {
            if (switchError.message.includes("Chain switch was not confirmed")) {
              throw switchError;
            }
            throw new Error(`Failed to switch to Arc Testnet automatically.\n\nPlease manually switch your wallet to Arc Testnet (chain ID ${destinationChainId}) in your wallet and click "Complete Mint & Pay" again.`);
          }
        } else {
          throw new Error(`Cannot switch chain automatically.\n\nPlease manually switch your wallet to Arc Testnet (chain ID ${destinationChainId}) in your wallet before clicking "Complete Mint & Pay".`);
        }
      } else {
        setError(null);
      }
      
      let finalChainCheck: number | undefined;
      try {
        if (walletClient) {
          finalChainCheck = await walletClient.getChainId();
        } else {
          finalChainCheck = chain?.id;
        }
      } catch (err) {
        finalChainCheck = chain?.id;
      }
      
      if (finalChainCheck !== destinationChainId) {
        const errorMsg = `CRITICAL ERROR: Your wallet is not on Arc Testnet.\n\nCurrent chain: ${finalChainCheck} (Sepolia)\nRequired chain: ${destinationChainId} (Arc Testnet)\n\nPlease manually switch your wallet to Arc Testnet in your wallet (Rabby/MetaMask) and click "Complete Mint & Pay" again.`;
        setError(errorMsg);
        setStep("error");
        throw new Error(errorMsg);
      }
      
      setError(null);

      setStep("waiting_attestation");
      
      let sourceConfig = CCTP_SUPPORTED_CHAINS[savedBurnResult.sourceChainId];
      
      if (!sourceConfig && savedBurnResult.sourceChainId) {
        sourceConfig = CCTP_SUPPORTED_CHAINS[11155111];
      }
      
      if (!sourceConfig) {
        sourceConfig = CCTP_SUPPORTED_CHAINS[11155111];
      }
      
      if (!sourceConfig) {
        throw new Error(`Source chain configuration not found. Chain ID: ${savedBurnResult.sourceChainId || 'unknown'}`);
      }

      let attestation = savedBurnResult.attestation;
      if (!attestation || attestation === 'PENDING' || !attestation.startsWith('0x')) {
        attestation = await fetchAttestation(
          savedBurnResult.messageHash, 
          true,
          savedBurnResult.burnTxHash,
          sourceConfig.domain
        );
      }

      if (!attestation || attestation === 'PENDING' || !attestation.startsWith('0x')) {
        throw new Error("Attestation is not ready yet. Please wait a few minutes and try again.");
      }
      
      let preMintChainCheck: number | undefined;
      try {
        if (walletClient) {
          preMintChainCheck = await walletClient.getChainId();
        } else {
          preMintChainCheck = chain?.id;
        }
      } catch (err) {
        preMintChainCheck = chain?.id;
      }
      
      if (preMintChainCheck !== destinationChainId) {
        throw new Error(`ERROR: Your wallet changed chains during the process. Current chain: ${preMintChainCheck}, required: ${destinationChainId} (Arc Testnet). Please manually switch your wallet to Arc Testnet and click "Complete Mint & Pay" again.`);
      }
      
      const destConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];
      if (!destConfig) {
        throw new Error(`Destination chain configuration not found. Chain ID: ${destinationChainId}`);
      }

      if (!attestation || !attestation.startsWith('0x') || attestation.length < 10) {
        throw new Error(`Invalid attestation format: ${attestation?.substring(0, 50)}...`);
      }

      if (!savedBurnResult.message || !savedBurnResult.message.startsWith('0x') || savedBurnResult.message.length < 10) {
        throw new Error(`Invalid message format: ${savedBurnResult.message?.substring(0, 50)}...`);
      }
      
      const lastChainCheck = chain?.id;
      if (lastChainCheck !== destinationChainId) {
        throw new Error(`CRITICAL ERROR: Your wallet is not on Arc Testnet. Current chain: ${lastChainCheck}, required: ${destinationChainId}. Please manually switch your wallet to Arc Testnet and click "Complete Mint & Pay" again.`);
      }
      
      if (!walletClient) {
        throw new Error("Wallet client not available. Please connect your wallet.");
      }
      
      setStep("minting");
      
      try {
        const mintHash = await walletClient.writeContract({
          address: destConfig.messageTransmitter as `0x${string}`,
          abi: MESSAGE_TRANSMITTER_ABI,
          functionName: "receiveMessage",
          args: [savedBurnResult.message, attestation as `0x${string}`],
        });
        
        setMintTxHash(mintHash);
        
        const { createPublicClient, http } = await import("viem");
        const { CCTP_SUPPORTED_CHAINS } = await import("@/lib/cctp-constants");
        const arcConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];
        
        const arcPublicClient = createPublicClient({
          chain: arcTestnet,
          transport: http(arcConfig.rpcUrl, {
            timeout: 30000,
            retryCount: 3,
            retryDelay: 1000,
          }),
        });
        
        const receipt = await arcPublicClient.waitForTransactionReceipt({ 
          hash: mintHash,
          timeout: 120000,
        });
        
        if (receipt.status === "success") {
          setStep("paying");
          
          if (!invoiceIdBytes32 || !INVOPAY_CONTRACT_ADDRESS) {
            setError("Invoice ID or contract address not found. Cannot pay invoice.");
            setStep("error");
            return;
          }
          
          try {
            await checkInvoiceStatusBeforePayment();
          } catch (checkError: any) {
            setError(checkError.message);
            setStep("error");
            return;
          }
          
          writePayInvoice({
            address: INVOPAY_CONTRACT_ADDRESS as `0x${string}`,
            abi: INVOPAY_ABI,
            functionName: "payInvoice",
            args: [invoiceIdBytes32],
          });
        } else {
          throw new Error("Mint transaction failed");
        }
      } catch (mintError: any) {
        const errorMsg = mintError?.message || mintError?.shortMessage || "Unknown error";
        
        if (errorMsg.includes("chain") || errorMsg.includes("ChainMismatch") || errorMsg.includes("does not match")) {
          setError(`CHAIN ERROR: Your wallet must be on Arc Testnet (chain ID ${destinationChainId}) to mint. Please manually switch your wallet to Arc Testnet and click "Complete Mint & Pay" again.`);
        } else {
          setError(`Failed to mint: ${errorMsg}. Please verify you are on Arc Testnet and have sufficient USDC for gas.`);
        }
        setStep("error");
      }
    } catch (err: any) {
      let errorMessage = "Failed to complete mint";
      
      if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setStep("error");
    }
  };

  return {
    step,
    error,
    sourceChainId,
    burnTxHash,
    mintTxHash,
    isUSDC,
    availableSourceChains,
    initiateCCTPPayment,
    paymentTxHash,
    savedBurnResult,
    canCompleteMint: !!savedBurnResult && !mintTxHash,
    completeMint,
    reset: () => {
      setStep("idle");
      setError(null);
      setSourceChainId(null);
      setBurnTxHash(null);
      setMintTxHash(null);
      setPaymentTxHash(null);
      setSavedBurnResult(null);
    },
  };
}



