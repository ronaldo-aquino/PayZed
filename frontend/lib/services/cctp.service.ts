import { Address, encodePacked, keccak256, parseUnits, decodeEventLog, pad, encodeFunctionData, defineChain } from "viem";
import { CCTP_SUPPORTED_CHAINS, CCTP_ATTESTATION_API } from "../cctp-constants";
import { createPublicClient, http } from "viem";
import { sepolia } from "wagmi/chains";

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const TOKEN_MESSENGER_ABI = [
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    name: "depositForBurn",
    outputs: [{ name: "_nonce", type: "uint64" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const MESSAGE_TRANSMITTER_ABI = [
  {
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    name: "receiveMessage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "message", type: "bytes" }],
    name: "getMessageHash",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "messageHash", type: "bytes32" }],
    name: "usedNonces",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface CCTPTransferParams {
  sourceChainId: number;
  destinationChainId: number;
  amount: string;
  recipient: Address;
  sourceWallet: Address;
}

export interface CCTPTransferResult {
  burnTxHash: `0x${string}`;
  messageHash: `0x${string}`;
  message: `0x${string}`;
  nonce: bigint;
  attestation?: string;
}

export async function burnUSDC(
  sourceChainId: number,
  destinationChainId: number,
  amount: string,
  recipient: Address,
  sourceWallet: Address,
  walletClient: any
): Promise<CCTPTransferResult> {
  const sourceConfig = CCTP_SUPPORTED_CHAINS[sourceChainId];
  const destConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];

  if (!sourceConfig || !destConfig) {
    throw new Error("Unsupported chain");
  }

  // Create chain object based on sourceChainId
  let sourceChain;
  if (sourceChainId === 11155111) {
    // Sepolia
    sourceChain = sepolia;
  } else {
    // For other chains, use defineChain
    sourceChain = defineChain({
      id: sourceChainId,
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

  const publicClient = createPublicClient({
    chain: sourceChain,
    transport: http(sourceConfig.rpcUrl, {
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  });

  const amountWei = parseUnits(amount, 6);

  const balance = await publicClient.readContract({
    address: sourceConfig.usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [sourceWallet],
  });

  if (balance < amountWei) {
    throw new Error(`Insufficient USDC balance. Required: ${amount}, Available: ${Number(balance) / 1e6}`);
  }

  const allowance = await publicClient.readContract({
    address: sourceConfig.usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [sourceWallet, sourceConfig.tokenMessenger],
  });

  if (allowance < amountWei) {
    // Approve maximum amount to avoid multiple approvals
    const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    
    const approveHash = await walletClient.writeContract({
      address: sourceConfig.usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [sourceConfig.tokenMessenger, maxApproval],
    });

    const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
    
    if (approveReceipt.status === "reverted") {
      throw new Error("Approval transaction was reverted. Please try again.");
    }
  }

  const mintRecipient = pad(recipient, { size: 32, dir: "right" }) as `0x${string}`;
  const destinationCallerParam = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
  
  // Get minimum fee from Circle API
  // CCTP v2 requires a fee - setting maxFee to 0 causes "insufficient_fee" error
  let maxFee = 0n;
  const isTestnet = sourceChainId === 11155111 || destinationChainId === 5042002; // Sepolia or Arc Testnet
  
  try {
    // Correct API format: /v2/burn/USDC/fees/:sourceDomainId/:destDomainId
    const feeApiUrl = isTestnet 
      ? `https://iris-api-sandbox.circle.com/v2/burn/USDC/fees/${sourceConfig.domain}/${destConfig.domain}`
      : `https://iris-api.circle.com/v2/burn/USDC/fees/${sourceConfig.domain}/${destConfig.domain}`;
    
    const feeResponse = await fetch(feeApiUrl);
    if (feeResponse.ok) {
      const feeData = await feeResponse.json();
      console.log(`[CCTP] Fee API response:`, feeData);
      
      // According to Circle docs, API returns an array with fee options
      // Each option has: finalityThreshold, minimumFee (in bps)
      // Use the minimum fee from the standard transfer (higher finalityThreshold)
      let minimumFeeBps = 1n; // Default to 1 bps
      
      if (Array.isArray(feeData) && feeData.length > 0) {
        // Find standard transfer (usually the one with higher finalityThreshold)
        // Or use the first one if only one option
        const standardTransfer = feeData.find((f: any) => f.finalityThreshold >= 1000) || feeData[0];
        minimumFeeBps = BigInt(standardTransfer.minimumFee || 1);
      } else if (feeData.minimumFee !== undefined) {
        // If it's an object with minimumFee directly
        minimumFeeBps = BigInt(feeData.minimumFee || 1);
      }
      
      // Calculate fee: (amount * feeBps) / 10000
      // Add 50% buffer to ensure we have enough
      maxFee = (amountWei * minimumFeeBps * BigInt(150)) / BigInt(10000);
    } else {
      const errorText = await feeResponse.text().catch(() => '');
      // If fee API fails, use a conservative estimate: 0.01% (1 bps) with 50% buffer
      // For 2 USDC (2 * 1e6): (2000000 * 1 * 150) / 10000 = 30000 (0.03 USDC)
      maxFee = (amountWei * BigInt(150)) / BigInt(10000);
    }
  } catch (error) {
    // If fee API fails, use a conservative estimate: 0.01% (1 bps) with 50% buffer
    maxFee = (amountWei * BigInt(150)) / BigInt(10000);
  }
  
  // Ensure minimum fee is reasonable
  // For USDC (6 decimals), ensure at least 0.0001 USDC (100 with 6 decimals)
  const minFee = BigInt(100); // 0.0001 USDC minimum
  if (maxFee < minFee) {
    maxFee = minFee;
  }
  
  const minFinalityThresholdParam = 0;

  let burnHash: `0x${string}`;
  
  try {
    const result = await walletClient.writeContract({
      address: sourceConfig.tokenMessenger,
      abi: TOKEN_MESSENGER_ABI,
      functionName: "depositForBurn",
      args: [
        amountWei,
        destConfig.domain,
        mintRecipient,
        sourceConfig.usdcAddress,
        destinationCallerParam,
        maxFee,
        minFinalityThresholdParam,
      ],
      chain: { id: sourceChainId },
    });
    
    burnHash = result;
  } catch (error: any) {
    const errorMessage = error?.message || error?.shortMessage || error?.cause?.message || "Unknown error";
    
    if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("fetch")) {
      throw new Error("Network error. Please check your connection and try again.");
    }
    
    throw new Error(`Failed to send burn transaction: ${errorMessage}. Please check your balance, allowance, and ensure you're on the correct network.`);
  }

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ 
      hash: burnHash,
      timeout: 120000,
    });
  } catch (error: any) {
    const errorMessage = error?.message || error?.shortMessage || "Unknown error";
    if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
      throw new Error("Network error. Transaction was sent but confirmation timed out. Please check the transaction on the block explorer.");
    }
    throw error;
  }

  if (receipt.status === "reverted") {
    let revertReason = "Unknown reason";
    try {
      const tx = await publicClient.getTransaction({ hash: burnHash });
      if (tx) {
        const code = await publicClient.call({
          to: tx.to,
          data: tx.input,
          value: tx.value,
        });
        if (code.data && code.data !== "0x") {
          revertReason = `Revert reason: ${code.data}`;
        }
      }
    } catch {
      revertReason = "Transaction was reverted. Check if you have sufficient USDC balance and allowance.";
    }
    throw new Error(`Burn transaction was reverted. ${revertReason} Transaction: ${burnHash}`);
  }

  const depositForBurnAbi = [
    {
      inputs: [
        { indexed: true, name: "burnToken", type: "address" },
        { indexed: false, name: "amount", type: "uint256" },
        { indexed: true, name: "depositor", type: "address" },
        { indexed: false, name: "mintRecipient", type: "bytes32" },
        { indexed: false, name: "destinationDomain", type: "uint32" },
        { indexed: false, name: "destinationTokenMessenger", type: "bytes32" },
        { indexed: false, name: "destinationCaller", type: "bytes32" },
        { indexed: false, name: "maxFee", type: "uint256" },
        { indexed: true, name: "minFinalityThreshold", type: "uint32" },
        { indexed: false, name: "hookData", type: "bytes" },
      ],
      name: "DepositForBurn",
      type: "event",
    },
  ] as const;

  const tokenMessengerAddress = sourceConfig.tokenMessenger.toLowerCase();
  
  let burnEvent = receipt.logs.find((log) => {
    if (log.address.toLowerCase() !== tokenMessengerAddress) {
      return false;
    }
    try {
      const decoded = decodeEventLog({
        abi: depositForBurnAbi,
        data: log.data,
        topics: log.topics,
      });
      return decoded.eventName === "DepositForBurn";
    } catch {
      return false;
    }
  });

  if (!burnEvent) {
    const eventSignature = keccak256(
      encodePacked(["string"], ["DepositForBurn(address,uint256,address,bytes32,uint32,bytes32,bytes32,uint256,uint32,bytes)"])
    );
    
    burnEvent = receipt.logs.find((log) => {
      if (log.address.toLowerCase() !== tokenMessengerAddress) {
        return false;
      }
      if (log.topics.length === 0) {
        return false;
      }
      return log.topics[0]?.toLowerCase() === eventSignature.toLowerCase();
    });
  }

  if (!burnEvent) {
    throw new Error(`Burn event not found in transaction ${burnHash}. Transaction was successful but event could not be decoded. Please check the transaction on ${sourceConfig.blockExplorer || 'block explorer'}.`);
  }

  const decoded = decodeEventLog({
    abi: depositForBurnAbi,
    data: burnEvent.data,
    topics: burnEvent.topics,
  }) as any;

  const { message, messageHash, nonce, attestation } = await getMessageFromCircleAPI(
    burnHash,
    sourceConfig.domain,
    true
  );

  return {
    burnTxHash: burnHash,
    messageHash,
    nonce,
    message,
    attestation, // Include attestation if available from v2 API
  };
}

async function getMessageFromCircleAPI(
  txHash: `0x${string}`,
  sourceDomain: number,
  isTestnet: boolean = true
): Promise<{ message: `0x${string}`; messageHash: `0x${string}`; nonce: bigint; attestation?: string }> {
  const apiUrl = isTestnet 
    ? `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomain}`
    : `https://iris-api.circle.com/v2/messages/${sourceDomain}`;
  
  const maxAttempts = 20; // Reduced to 20 attempts
  const initialDelayMs = 2000; // Start with 2 seconds (faster)
  const maxDelayMs = 8000; // Max 8 seconds between attempts (faster)
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Progressive delay: longer waits for later attempts
      const delayMs = Math.min(initialDelayMs + (attempt * 500), maxDelayMs);
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      
      const fullUrl = `${apiUrl}?transactionHash=${txHash}`;
      console.log(`[CCTP] Fetching message from Circle API (attempt ${attempt + 1}/${maxAttempts}):`, fullUrl);
      
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        let errorData: any = {};
        let errorText = "";
        try {
          errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // Not JSON, use as plain text
            }
          }
        } catch {
          // If we can't parse the error, continue with empty errorData
        }
        
        
        if (response.status === 404) {
          // 404 means the message is not found - could be not indexed yet or invalid transaction
          // For CCTP v2, 404 might mean the transaction hasn't been indexed yet
          // Circle's API can take several minutes to index transactions
          if (attempt < maxAttempts - 1) {
            // Wait longer and retry - Circle may need more time to index
            continue;
          } else {
            throw new Error(`Message not found in Circle API after ${maxAttempts} attempts (${Math.round((maxAttempts * delayMs) / 1000 / 60)} minutes of waiting). This usually means: 1) The transaction is still being processed by Circle (can take 5-15 minutes), 2) The burn transaction did not create a valid CCTP message, or 3) There's an issue with Circle's API. Please verify the burn transaction on the block explorer and try the "Complete Mint & Pay" button in 10-15 minutes. Transaction: ${txHash}`);
          }
        }
        
        if (response.status === 400) {
          // 400 usually means the transaction hash is invalid or not found yet
          // This is common right after a burn - Circle needs time to index it
          if (attempt < maxAttempts - 1) {
            // Continue to next attempt with longer delay
            continue;
          } else {
            throw new Error(`Transaction not found in Circle API after ${maxAttempts} attempts. The transaction may still be processing. Please wait a few minutes and use the "Complete Mint & Pay" button. Transaction: ${txHash.substring(0, 10)}...`);
          }
        }
        
        const errorMsg = errorData?.message || errorData?.error || errorText || `HTTP ${response.status}`;
        throw new Error(`Circle API error (${response.status}): ${errorMsg}`);
      }
      
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        const messageData = data.messages[0];
        
        // Check message status - if it's still pending, wait
        const messageStatus = messageData.status;
        if (messageStatus === 'pending_confirmations' || messageStatus === 'pending') {
          // For pending_confirmations, wait longer but don't fail immediately
          // Circle needs time to process - this is normal
          if (attempt < maxAttempts - 1) {
            // Use longer delay for pending confirmations
            await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs * 2, maxDelayMs)));
            continue;
          } else {
            // After max attempts, still allow user to complete manually
            throw new Error(`Message is still pending confirmations. This is normal - Circle needs 5-15 minutes to process. Please use the "Complete Mint & Pay" button in a few minutes.`);
          }
        }
        
        // Check for both 'nonce' and 'eventNonce' fields
        const nonceValue = messageData.nonce ?? messageData.eventNonce ?? messageData.decodedMessage?.nonce;
        
        // Verify message is not empty (sometimes API returns '0x' while processing)
        const rawMessage = messageData.message;
        if (!rawMessage || rawMessage === '0x' || rawMessage.length < 10) {
          if (attempt < maxAttempts - 1) {
            continue; // Wait and retry
          } else {
            throw new Error(`Message is not yet available. Please wait a few more minutes and try again.`);
          }
        }
        
        if (rawMessage && nonceValue !== undefined) {
          const message = rawMessage as `0x${string}`;
          const messageHash = keccak256(message);
          const nonce = BigInt(nonceValue);
          
          // Only return attestation if it's a valid hex string (not 'PENDING' or empty)
          let attestation: string | undefined = undefined;
          const rawAttestation = messageData.attestation;
          if (rawAttestation && 
              typeof rawAttestation === 'string' && 
              rawAttestation !== 'PENDING' && 
              rawAttestation !== 'pending' &&
              rawAttestation.startsWith('0x') &&
              rawAttestation.length > 2) {
            attestation = rawAttestation;
          } else {
            console.log(`[CCTP] Message found but attestation is not ready yet (${rawAttestation}), will need to fetch separately`);
          }
          
          return { message, messageHash, nonce, attestation };
        } else {
        }
      } else {
      }
      
      // If we get here, the response was OK but no messages found
      // This might mean the transaction is still being processed
      if (attempt < maxAttempts - 1) {
        continue; // Will wait before next attempt
      }
    } catch (error: any) {
      if (attempt === maxAttempts - 1) {
        const errorMessage = error?.message || "Could not retrieve message from Circle API";
        throw new Error(`${errorMessage}. Please try again or check the transaction on the block explorer.`);
      }
      // Continue to next attempt
    }
  }
  
  throw new Error("Message not found in Circle API. Please try again or check the transaction on the block explorer.");
}

export async function fetchAttestation(
  messageHash: `0x${string}`,
  isTestnet: boolean = true,
  txHash: `0x${string}`,
  sourceDomain: number
): Promise<string> {
  // CCTP v2: Get attestation from v2 API endpoint
  // The v1 /attestations endpoint is deprecated and returns 404
  const maxAttempts = 15; // Reduced attempts
  const initialDelayMs = 2000; // Faster initial delay
  const maxDelayMs = 8000; // Faster max delay

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const delayMs = Math.min(initialDelayMs + (attempt * 500), maxDelayMs);
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const messageData = await getMessageFromCircleAPI(txHash, sourceDomain, isTestnet);
      
      if (messageData.attestation) {
        return messageData.attestation;
      }

      // If no attestation yet, wait and retry (Circle may still be processing)
      if (attempt < maxAttempts - 1) {
        continue;
      }

      throw new Error("Attestation not yet available. The transaction may still be processing. Please wait a few minutes and try again.");
    } catch (error: any) {
      if (attempt === maxAttempts - 1) {
        const errorMessage = error?.message || "Failed to fetch attestation";
        throw new Error(`${errorMessage}. Please wait a few minutes for Circle to process the transaction and try the 'Complete Mint & Pay' button again.`);
      }
      // Continue to next attempt
    }
  }

  throw new Error("Attestation not available after multiple attempts. Please wait a few minutes and try again.");
}

export async function mintUSDC(
  destinationChainId: number,
  message: `0x${string}`,
  attestation: string,
  walletClient: any
): Promise<`0x${string}`> {
  const destConfig = CCTP_SUPPORTED_CHAINS[destinationChainId];

  if (!destConfig) {
    throw new Error("Unsupported destination chain");
  }

  // For destination chain (Arc Testnet), use defineChain
  const destChain = defineChain({
    id: destinationChainId,
    name: destConfig.name,
    nativeCurrency: {
      decimals: 18,
      name: "USDC",
      symbol: "USDC",
    },
    rpcUrls: {
      default: {
        http: [destConfig.rpcUrl],
      },
    },
    blockExplorers: destConfig.blockExplorer ? {
      default: {
        name: "ArcScan",
        url: destConfig.blockExplorer,
      },
    } : undefined,
    testnet: true,
  });

  const publicClient = createPublicClient({
    chain: destChain,
    transport: http(destConfig.rpcUrl, {
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  });

  if (!attestation || !attestation.startsWith('0x') || attestation.length < 10) {
    throw new Error(`Invalid attestation format: ${attestation?.substring(0, 50)}...`);
  }

  if (!message || !message.startsWith('0x') || message.length < 10) {
    throw new Error(`Invalid message format: ${message?.substring(0, 50)}...`);
  }

  
  // CRITICAL: Verify the walletClient is on the correct chain BEFORE attempting mint
  // This prevents the chain mismatch error where wallet is on Arc but transaction expects Sepolia
  let walletChainId: number;
  try {
    walletChainId = await walletClient.getChainId();
    
    if (walletChainId !== destinationChainId) {
      throw new Error(`CRITICAL ERROR: Your wallet is on chain ${walletChainId}, but needs to be on ${destinationChainId} (Arc Testnet) to mint. Please manually switch your wallet to Arc Testnet and click "Complete Mint & Pay" again.`);
    }
  } catch (chainCheckError: any) {
    // If getChainId fails, it might be a different error - check the message
    if (chainCheckError.message.includes("CRITICAL ERROR")) {
      throw chainCheckError;
    }
    // If it's a different error, log it but continue - the writeContract will fail with a clearer error
  }
  
  let mintHash: `0x${string}`;
  try {
    // The walletClient should be on the correct chain now (verified above)
    // If it's not, the error will be caught below
    mintHash = await walletClient.writeContract({
      address: destConfig.messageTransmitter,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [message, attestation as `0x${string}`],
    });
  } catch (error: any) {
    const errorMsg = error?.message || error?.shortMessage || error?.cause?.message || "Unknown error";
    
    if (errorMsg.includes("chain") || errorMsg.includes("ChainMismatch") || errorMsg.includes("does not match") || errorMsg.includes("current chain") || errorMsg.includes("target chain")) {
      throw new Error(`CHAIN ERROR: Your wallet must be on Arc Testnet (chain ID ${destinationChainId}) to mint. The error indicates a chain mismatch. Please: 1) Manually switch your wallet to Arc Testnet, 2) Wait for the switch confirmation, 3) Click "Complete Mint & Pay" again.`);
    }
    
    throw new Error(`Failed to send mint transaction: ${errorMsg}. Please verify you are on Arc Testnet (chain ID ${destinationChainId}) and have sufficient gas.`);
  }

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ 
      hash: mintHash,
      timeout: 120000,
    });
  } catch (error: any) {
    const errorMsg = error?.message || error?.shortMessage || "Unknown error";
    throw new Error(`Mint transaction was sent but confirmation failed: ${errorMsg}. Please check the transaction on the block explorer: ${mintHash}`);
  }

  if (receipt.status === "reverted") {
    // Try to get revert reason by simulating the call
    let revertReason = "Unknown reason";
    try {
      await publicClient.call({
        to: destConfig.messageTransmitter,
        data: encodeFunctionData({
          abi: MESSAGE_TRANSMITTER_ABI,
          functionName: "receiveMessage",
          args: [message, attestation as `0x${string}`],
        }),
        account: walletClient.account,
      });
    } catch (callError: any) {
      const errorMsg = callError?.message || callError?.shortMessage || "";
      
      // Check for common revert reasons
      if (errorMsg.includes("InvalidAttestation") || errorMsg.includes("invalid attestation")) {
        revertReason = "Invalid attestation - verify it is correct and not expired";
      } else if (errorMsg.includes("MessageAlreadyExecuted") || errorMsg.includes("already executed")) {
        revertReason = "This message was already used - mint was already done previously";
      } else if (errorMsg.includes("InvalidMessage") || errorMsg.includes("invalid message")) {
        revertReason = "Invalid message - verify the burn was done correctly";
      } else if (errorMsg.includes("Pausable: paused")) {
        revertReason = "Contract is paused - try again later";
      } else if (errorMsg) {
        revertReason = errorMsg.substring(0, 100);
      }
    }
    
    throw new Error(`Mint was reverted. ${revertReason} Transaction: ${mintHash}. Check on block explorer: ${destConfig.blockExplorer}/tx/${mintHash}`);
  }

  return mintHash;
}



