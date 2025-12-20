import { Address, parseUnits } from "viem";
import { ERC20_ABI, PAYZED_CONTRACT_ADDRESS } from "@/lib/constants";

export interface ApproveTokenParams {
  tokenAddress: Address;
  amount: bigint;
  spender?: Address;
}

export interface CheckAllowanceParams {
  tokenAddress: Address;
  owner: Address;
  spender?: Address;
}

export function getApproveArgs(params: ApproveTokenParams) {
  const spender = params.spender || (PAYZED_CONTRACT_ADDRESS as Address);
  const approveAmount = params.amount + params.amount / BigInt(10);

  return {
    address: params.tokenAddress,
    abi: ERC20_ABI,
    functionName: "approve" as const,
    args: [spender, approveAmount],
  };
}

export function getAllowanceArgs(params: CheckAllowanceParams) {
  const spender = params.spender || (PAYZED_CONTRACT_ADDRESS as Address);

  return {
    address: params.tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance" as const,
    args: [params.owner, spender],
  };
}

export function getBalanceArgs(tokenAddress: Address, owner: Address) {
  return {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: [owner],
  };
}

export function getDecimalsArgs(tokenAddress: Address) {
  return {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals" as const,
  };
}

export function calculateApproveAmount(requiredAmount: bigint): bigint {
  return requiredAmount + requiredAmount / BigInt(10);
}

export function needsApproval(
  allowance: bigint | undefined | null,
  requiredAmount: bigint
): boolean {
  if (!allowance || typeof allowance !== "bigint") return true;
  return allowance < requiredAmount;
}

export function parseTokenAmount(amount: number, decimals: number = 6): bigint {
  return parseUnits(amount.toString(), decimals);
}
