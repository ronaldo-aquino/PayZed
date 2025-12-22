import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from "wagmi";
import { burnUSDC, fetchAttestation, approveUSDCForCCTP, mintUSDC } from "@/lib/services/cctp.service";
import { CCTP_SUPPORTED_CHAINS } from "@/lib/cctp-constants";
import { ARC_TESTNET_CHAIN_ID } from "@/lib/constants";
import { arcTestnet } from "@/lib/wagmi";
import { parseUnits, formatEther } from "viem";

export type CCTPTransferStep =
  | "idle"
  | "approving"
  | "burning"
  | "waiting_attestation"
  | "minting"
  | "success"
  | "error";

export function useCCTPTransfer() {
  const { address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [step, setStep] = useState<CCTPTransferStep>("idle");
  const [sourceChainId, setSourceChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [burnTxHash, setBurnTxHash] = useState<`0x${string}` | null>(null);
  const [mintTxHash, setMintTxHash] = useState<`0x${string}` | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [savedBurnResult, setSavedBurnResult] = useState<{
    message: `0x${string}`;
    messageHash: `0x${string}`;
    attestation?: string;
    burnTxHash: `0x${string}`;
    sourceChainId: number;
  } | null>(null);

  const destinationChainId = ARC_TESTNET_CHAIN_ID;

  // Filter to show only testnets when destination is Arc Testnet
  const testnetChainIds = [11155111, 84532]; // Sepolia and Base Sepolia
  const availableSourceChains = Object.values(CCTP_SUPPORTED_CHAINS).filter(
    (chain) => {
      if (chain.chainId === destinationChainId) return false;
      // When destination is Arc Testnet, only show testnet chains
      if (destinationChainId === ARC_TESTNET_CHAIN_ID) {
        return testnetChainIds.includes(chain.chainId);
      }
      return true;
    }
  );

  const initiateTransfer = async (selectedSourceChainId: number, transferAmount: string) => {
    if (!address || !walletClient) {
      setError("Please connect your wallet");
      return;
    }

    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setSourceChainId(selectedSourceChainId);
    setAmount(transferAmount);
    setError(null);

    try {
      // Check Arc Testnet balance for gas
      const { createPublicClient, http } = await import("viem");
      const arcConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];
      
      if (!arcConfig) {
        throw new Error("Arc Testnet configuration not found");
      }

      const arcPublicClient = createPublicClient({
        chain: arcTestnet,
        transport: http(arcConfig.rpcUrl),
      });

      const usdcBalance = await arcPublicClient.getBalance({ address });
      const minRequiredBalance = BigInt("1000000000000000");
      
      if (usdcBalance < minRequiredBalance) {
        const balanceFormatted = formatEther(usdcBalance);
        const errorMsg = `Insufficient USDC balance on Arc Testnet for gas fees.\n\n` +
          `Current balance: ${balanceFormatted} USDC\n` +
          `Required: ~0.001 USDC minimum for gas fees\n\n` +
          `Please add USDC to your wallet on Arc Testnet before proceeding.`;
        setError(errorMsg);
        setStep("error");
        return;
      }
    } catch (balanceCheckError: any) {
      if (balanceCheckError.message && balanceCheckError.message.includes("Insufficient USDC")) {
        setError(balanceCheckError.message);
        setStep("error");
        return;
      }
    }

    setStep("approving");

    try {
      const sourceConfig = CCTP_SUPPORTED_CHAINS[selectedSourceChainId];
      if (!sourceConfig) {
        throw new Error("Unsupported source chain");
      }

      // Switch to source chain if needed
      if (publicClient?.chain?.id !== selectedSourceChainId && switchChainAsync) {
        await switchChainAsync({ chainId: selectedSourceChainId });
      }

      // Check native token balance on source chain
      const { createPublicClient, http, formatEther, defineChain } = await import("viem");
      const { sepolia } = await import("wagmi/chains");
      const { baseSepolia } = await import("@/lib/wagmi");
      
      let sourceChain;
      if (selectedSourceChainId === 11155111) {
        sourceChain = sepolia;
      } else if (selectedSourceChainId === 84532) {
        sourceChain = baseSepolia;
      } else {
        sourceChain = defineChain({
          id: selectedSourceChainId,
          name: sourceConfig.name,
          nativeCurrency: {
            decimals: 18,
            name: "ETH",
            symbol: "ETH",
          },
          rpcUrls: {
            default: {
              http: [sourceConfig.rpcUrl],
            },
          },
          blockExplorers: sourceConfig.blockExplorer ? {
            default: {
              name: "Explorer",
              url: sourceConfig.blockExplorer,
            },
          } : undefined,
          testnet: true,
        });
      }

      const sourcePublicClient = createPublicClient({
        chain: sourceChain,
        transport: http(sourceConfig.rpcUrl),
      });

      const nativeBalance = await sourcePublicClient.getBalance({ address });
      const minRequiredBalance = BigInt("1000000000000000");
      
      if (nativeBalance < minRequiredBalance) {
        const balanceFormatted = formatEther(nativeBalance);
        const errorMsg = `Insufficient native token balance on ${sourceConfig.name} for gas fees.\n\n` +
          `Current balance: ${balanceFormatted} ETH\n` +
          `Required: ~0.001 ETH minimum for burn transaction gas\n\n` +
          `Please add native tokens (ETH) to your wallet on ${sourceConfig.name} before proceeding.`;
        setError(errorMsg);
        setStep("error");
        return;
      }

      // Approve USDC
      const approveHash = await approveUSDCForCCTP(
        selectedSourceChainId,
        transferAmount,
        address,
        walletClient
      );

      if (approveHash && approveHash !== "0x") {
        const approvePublicClient = createPublicClient({
          chain: sourceChain,
          transport: http(sourceConfig.rpcUrl),
        });
        await approvePublicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Burn USDC
      setStep("burning");
      const burnResult = await burnUSDC(
        selectedSourceChainId,
        destinationChainId,
        transferAmount,
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
        sourceChainId: selectedSourceChainId,
      });

      // Fetch attestation if not available
      let attestation = burnResult.attestation;
      if (!attestation) {
        setStep("waiting_attestation");
        attestation = await fetchAttestation(
          burnResult.messageHash,
          true,
          burnResult.burnTxHash,
          sourceConfig.domain
        );
      }

      // Switch to Arc Testnet
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
              break;
            }
            attempts++;
          }
          
          if (currentChainId !== destinationChainId) {
            throw new Error(`Please manually switch your wallet to Arc Testnet (chain ID ${destinationChainId})`);
          }
        } else {
          throw new Error(`Please manually switch your wallet to Arc Testnet (chain ID ${destinationChainId})`);
        }
      }

      // Mint USDC on Arc Testnet
      if (!attestation || !attestation.startsWith('0x') || attestation.length < 10) {
        throw new Error(`Invalid attestation format`);
      }

      if (!burnResult.message || !burnResult.message.startsWith('0x') || burnResult.message.length < 10) {
        throw new Error(`Invalid message format`);
      }

      setStep("minting");
      const mintHash = await mintUSDC(
        destinationChainId,
        burnResult.message,
        attestation,
        walletClient
      );

      setMintTxHash(mintHash);
      setStep("success");
    } catch (err: any) {
      let errorMessage = "Transfer failed";
      
      if (err?.message) {
        if (err.message.includes("User rejected")) {
          errorMessage = "Transaction was rejected. Please try again.";
        } else if (err.message.includes("insufficient funds") || err.message.includes("insufficient balance")) {
          errorMessage = "Insufficient balance. Please ensure you have enough USDC.";
        } else if (err.message.includes("network") || err.message.includes("chain")) {
          errorMessage = "Network error. Please check your connection and try again.";
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
      setError("Burn data not found. Please start the transfer process again.");
      return;
    }

    setError(null);

    try {
      // Switch to Arc Testnet if needed
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
              break;
            }
            attempts++;
          }
          
          if (currentChainId !== destinationChainId) {
            throw new Error(`Please manually switch your wallet to Arc Testnet (chain ID ${destinationChainId})`);
          }
        } else {
          throw new Error(`Please manually switch your wallet to Arc Testnet (chain ID ${destinationChainId})`);
        }
      }

      // Fetch attestation
      setStep("waiting_attestation");
      const sourceConfig = CCTP_SUPPORTED_CHAINS[savedBurnResult.sourceChainId] || CCTP_SUPPORTED_CHAINS[11155111];
      
      if (!sourceConfig) {
        throw new Error(`Source chain configuration not found`);
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

      // Mint USDC
      setStep("minting");
      const destConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];
      if (!destConfig) {
        throw new Error(`Destination chain configuration not found`);
      }

      const mintHash = await mintUSDC(
        destinationChainId,
        savedBurnResult.message,
        attestation,
        walletClient
      );

      setMintTxHash(mintHash);
      setStep("success");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to complete mint";
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
    amount,
    availableSourceChains,
    initiateTransfer,
    savedBurnResult,
    canCompleteMint: !!savedBurnResult && !mintTxHash,
    completeMint,
    reset: () => {
      setStep("idle");
      setError(null);
      setSourceChainId(null);
      setBurnTxHash(null);
      setMintTxHash(null);
      setAmount("");
      setSavedBurnResult(null);
    },
  };
}


