import { Address, parseUnits } from "viem";
import {
  INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  EURC_CONTRACT_ADDRESS,
} from "@/lib/constants";
import { INVOPAY_SUBSCRIPTION_ABI } from "@/lib/subscription-contract-abi";
import { uuidToBytes32 } from "./contract.service";

export interface CreateSubscriptionParams {
  receiver: Address;
  payer: Address;
  amount: number;
  currency: "USDC" | "EURC";
  period: number;
  description: string;
}

export interface PaySubscriptionParams {
  subscriptionId: string;
}

export function getTokenAddress(currency: "USDC" | "EURC"): Address {
  return currency === "USDC"
    ? (USDC_CONTRACT_ADDRESS as Address)
    : (EURC_CONTRACT_ADDRESS as Address);
}

export function parseAmount(amount: number, decimals: number = 6): bigint {
  return parseUnits(amount.toString(), decimals);
}

export function calculateCreationFee(amount: number): number {
  return amount * 0.0005;
}

export function calculateRenewalFee(amount: number): number {
  return amount * 0.0005;
}

export function getCreateSubscriptionArgs(params: CreateSubscriptionParams) {
  const tokenAddress = getTokenAddress(params.currency);
  const amountInWei = parseAmount(params.amount);
  const periodInSeconds = BigInt(params.period);

  return {
    address: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as Address,
    abi: INVOPAY_SUBSCRIPTION_ABI,
    functionName: "createSubscription" as const,
    args: [
      params.receiver,
      params.payer,
      amountInWei,
      tokenAddress,
      periodInSeconds,
      params.description,
    ],
  };
}

export function getPaySubscriptionArgs(subscriptionId: string) {
  const subscriptionIdBytes32 = uuidToBytes32(subscriptionId);

  return {
    address: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as Address,
    abi: INVOPAY_SUBSCRIPTION_ABI,
    functionName: "paySubscription" as const,
    args: [subscriptionIdBytes32],
  };
}

export function getCancelByCreatorArgs(subscriptionId: string) {
  const subscriptionIdBytes32 = uuidToBytes32(subscriptionId);

  return {
    address: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as Address,
    abi: INVOPAY_SUBSCRIPTION_ABI,
    functionName: "cancelByCreator" as const,
    args: [subscriptionIdBytes32],
  };
}

export function getCancelByPayerArgs(subscriptionId: string) {
  const subscriptionIdBytes32 = uuidToBytes32(subscriptionId);

  return {
    address: INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS as Address,
    abi: INVOPAY_SUBSCRIPTION_ABI,
    functionName: "cancelByPayer" as const,
    args: [subscriptionIdBytes32],
  };
}

