export const CCTP_DOMAINS = {
  ETHEREUM: 0,
  BASE: 6,
  POLYGON: 7,
  SEPOLIA: 0,
  ARC_TESTNET: 26,
} as const;

export type CCTPDomain = typeof CCTP_DOMAINS[keyof typeof CCTP_DOMAINS];

export interface CCTPChainConfig {
  domain: CCTPDomain;
  chainId: number;
  name: string;
  rpcUrl: string;
  tokenMessenger: `0x${string}`;
  messageTransmitter: `0x${string}`;
  usdcAddress: `0x${string}`;
  blockExplorer?: string;
}

export const CCTP_SUPPORTED_CHAINS: Record<number, CCTPChainConfig> = {
  1: {
    domain: CCTP_DOMAINS.ETHEREUM,
    chainId: 1,
    name: "Ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitter: "0xbaC0179bB358A8936169a63408C8481D582390C4",
    usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    blockExplorer: "https://etherscan.io",
  },
  8453: {
    domain: CCTP_DOMAINS.BASE,
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitter: "0xbaC0179bB358A8936169a63408C8481D582390C4",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    blockExplorer: "https://basescan.org",
  },
  84532: {
    domain: CCTP_DOMAINS.BASE,
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737E5cEBEeba77eFE34d4Aa090756590b1Ce275",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    blockExplorer: "https://sepolia.basescan.org",
  },
  137: {
    domain: CCTP_DOMAINS.POLYGON,
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitter: "0xbaC0179bB358A8936169a63408C8481D582390C4",
    usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    blockExplorer: "https://polygonscan.com",
  },
  5042002: {
    domain: CCTP_DOMAINS.ARC_TESTNET,
    chainId: 5042002,
    name: "Arc Testnet",
    rpcUrl: "https://rpc.testnet.arc.network",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    usdcAddress: "0x3600000000000000000000000000000000000000",
    blockExplorer: "https://testnet.arcscan.app",
  },
  11155111: {
    domain: CCTP_DOMAINS.SEPOLIA,
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737E5cEBEeba77eFE34d4Aa090756590b1Ce275",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    blockExplorer: "https://sepolia.etherscan.io",
  },
};

// Note: CCTP V2 uses /v2/messages/ endpoint, not /attestations
// This constant is kept for reference but not used in the codebase
// The actual API endpoints are constructed in cctp.service.ts
export const CCTP_ATTESTATION_API = {
  testnet: "https://iris-api-sandbox.circle.com/v2/messages",
  mainnet: "https://iris-api.circle.com/v2/messages",
};

export const CCTP_ABI = {
  TokenMessenger: [
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
  ],
  MessageTransmitter: [
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
      outputs: [{ name: "messageHash", type: "bytes32" }],
      stateMutability: "view",
      type: "function",
    },
  ],
} as const;




