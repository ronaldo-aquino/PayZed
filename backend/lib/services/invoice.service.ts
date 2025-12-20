import { Address, parseUnits } from "viem";
import {
  PAYZED_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  EURC_CONTRACT_ADDRESS,
} from "@/lib/constants";
import { PAYZED_ABI } from "@/lib/contract-abi";
import { uuidToBytes32 } from "./contract.service";

export interface CreateInvoiceParams {
  invoiceId: string;
  receiver: Address;
  amount: number;
  currency: "USDC" | "EURC";
  expiresAt?: number;
  paymentLink: string;
  description: string;
}

export interface PayInvoiceParams {
  invoiceId: string;
}

export function getTokenAddress(currency: "USDC" | "EURC"): Address {
  return currency === "USDC"
    ? (USDC_CONTRACT_ADDRESS as Address)
    : (EURC_CONTRACT_ADDRESS as Address);
}

export function parseAmount(amount: number, decimals: number = 6): bigint {
  return parseUnits(amount.toString(), decimals);
}

export function formatAmount(amount: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const quotient = amount / divisor;
  const remainder = amount % divisor;
  const decimalPart = Number(remainder) / Number(divisor);
  return (Number(quotient) + decimalPart).toFixed(decimals);
}

export function calculateFee(amount: number): number {
  return amount * 0.0005;
}

export function getCreateInvoiceArgs(params: CreateInvoiceParams) {
  const invoiceIdBytes32 = uuidToBytes32(params.invoiceId);
  const tokenAddress = getTokenAddress(params.currency);
  const amountInWei = parseAmount(params.amount);
  const expiresAt = params.expiresAt || 0;

  return {
    address: PAYZED_CONTRACT_ADDRESS as Address,
    abi: PAYZED_ABI,
    functionName: "createInvoice" as const,
    args: [
      invoiceIdBytes32,
      params.receiver,
      amountInWei,
      tokenAddress,
      expiresAt,
      params.paymentLink,
      params.description,
    ],
  };
}

export function getPayInvoiceArgs(invoiceId: string) {
  const invoiceIdBytes32 = uuidToBytes32(invoiceId);

  return {
    address: PAYZED_CONTRACT_ADDRESS as Address,
    abi: PAYZED_ABI,
    functionName: "payInvoice" as const,
    args: [invoiceIdBytes32],
  };
}

export function getWithdrawFeesArgs(tokenAddress: Address, recipient: Address) {
  return {
    address: PAYZED_CONTRACT_ADDRESS as Address,
    abi: PAYZED_ABI,
    functionName: "withdrawFees" as const,
    args: [tokenAddress, recipient],
  };
}
