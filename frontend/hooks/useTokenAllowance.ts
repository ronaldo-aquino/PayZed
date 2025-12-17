import { useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { INVOPAY_CONTRACT_ADDRESS, ARC_TESTNET_CHAIN_ID } from "@/lib/constants";
import { getAllowanceArgs, needsApproval, getApproveArgs } from "@backend/lib/services/token.service";

export function useTokenAllowance(
  address: string | undefined,
  tokenAddress: string | undefined,
  feeAmountInWei: bigint | undefined
) {
  const { chain } = useAccount();
  const allowanceArgs =
    address && INVOPAY_CONTRACT_ADDRESS && tokenAddress
      ? getAllowanceArgs({
          tokenAddress: tokenAddress as `0x${string}`,
          owner: address as `0x${string}`,
        })
      : undefined;

  const isCorrectChain = chain?.id === ARC_TESTNET_CHAIN_ID;

  const {
    data: allowance,
    refetch: refetchAllowance,
    isLoading: isLoadingAllowance,
    error: allowanceError,
    isSuccess: isAllowanceSuccess,
  } = useReadContract({
    ...allowanceArgs,
    query: {
      enabled: !!address && !!INVOPAY_CONTRACT_ADDRESS && !!tokenAddress && !!feeAmountInWei && isCorrectChain,
      retry: 1,
      retryDelay: 1000,
      staleTime: 0,
      gcTime: 0,
    },
  });

  const {
    writeContract: writeApproval,
    data: approvalTxHash,
    isPending: isApproving,
  } = useWriteContract();

  const { isLoading: isApprovalConfirming, data: approvalReceipt } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
  });

  useEffect(() => {
    if (approvalReceipt && approvalReceipt.status === "success") {
      setTimeout(() => {
      refetchAllowance();
      }, 1000);
    }
  }, [approvalReceipt, refetchAllowance]);

  const normalizedAllowance = allowance === null || allowance === undefined || allowance === "0x" 
    ? undefined 
    : (allowance as bigint | undefined);

  const needsApprovalCheck = 
    !isCorrectChain || 
    !address || 
    !tokenAddress || 
    !feeAmountInWei ||
    isLoadingAllowance ||
    allowanceError ||
    !isAllowanceSuccess ||
    !normalizedAllowance ||
    typeof normalizedAllowance !== "bigint" ||
    needsApproval(normalizedAllowance, feeAmountInWei);

  const handleApprove = () => {
    if (!tokenAddress || !feeAmountInWei || !INVOPAY_CONTRACT_ADDRESS) return;

    const approveArgs = getApproveArgs({
      tokenAddress: tokenAddress as `0x${string}`,
      amount: feeAmountInWei,
    });

    writeApproval(approveArgs);
  };

  return {
    allowance: normalizedAllowance,
    needsApproval: needsApprovalCheck,
    isLoadingAllowance,
    allowanceError,
    isAllowanceSuccess,
    handleApprove,
    isApproving,
    isApprovalConfirming,
    refetchAllowance,
  };
}
