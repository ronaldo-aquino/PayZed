import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";
import { base, polygon, mainnet, sepolia } from "wagmi/chains";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseSepolia Explorer",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
});

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "000000000000000000000000000000000000000000";

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  // NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set. Using placeholder. Get your project ID from https://cloud.walletconnect.com
}

export const config = getDefaultConfig({
  appName: "PayZed",
  projectId,
  chains: [arcTestnet, mainnet, base, baseSepolia, polygon, sepolia],
  ssr: true,
  transports: {
    [arcTestnet.id]: http(),
    [mainnet.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [polygon.id]: http(),
    [sepolia.id]: http(),
  },
});
