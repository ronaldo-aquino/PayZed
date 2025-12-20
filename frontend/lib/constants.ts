export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";

export const USDC_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || "0x3600000000000000000000000000000000000000";
export const EURC_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_EURC_CONTRACT_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

export const PAYZED_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYZED_CONTRACT_ADDRESS || "";
export const PAYZED_FEES_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYZED_FEES_CONTRACT_ADDRESS || "";

export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;
