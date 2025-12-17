import { Button } from "@/components/ui/button";

interface FeeDisplayProps {
  feeAmount: number;
  currency: string;
  tokenAddress: string | undefined;
  needsApproval: boolean;
  isLoadingAllowance: boolean;
  allowanceError: any;
  isAllowanceSuccess: boolean;
  allowance: bigint | undefined | unknown;
  feeAmountInWei: bigint | undefined;
  isApproving: boolean;
  isApprovalConfirming: boolean;
  onApprove: () => void;
  refetchAllowance?: () => void;
}

export function FeeDisplay({
  feeAmount,
  currency,
  tokenAddress,
  needsApproval,
  isLoadingAllowance,
  allowanceError,
  isAllowanceSuccess,
  allowance,
  feeAmountInWei,
  isApproving,
  isApprovalConfirming,
  onApprove,
  refetchAllowance,
}: FeeDisplayProps) {
  const allowanceBigInt =
    allowance !== undefined && allowance !== null && typeof allowance === "bigint"
      ? allowance
      : undefined;

  const isApproved =
    !isLoadingAllowance &&
    !allowanceError &&
    isAllowanceSuccess &&
    !needsApproval &&
    allowanceBigInt !== undefined &&
    allowanceBigInt !== null &&
    typeof allowanceBigInt === "bigint" &&
    allowanceBigInt > 0n &&
    feeAmountInWei !== undefined &&
    feeAmountInWei !== null &&
    typeof feeAmountInWei === "bigint" &&
    allowanceBigInt >= feeAmountInWei;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Platform Fee</p>
          <p className="text-xs text-blue-700 dark:text-blue-300">0.05% of invoice amount</p>
        </div>
        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
          {feeAmount.toFixed(6)} {currency}
        </p>
      </div>


      {isLoadingAllowance && (
        <div className="flex items-center gap-2 pt-3 border-t border-blue-200 dark:border-blue-800">
          <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
            <span className="text-gray-600 dark:text-gray-400 text-xs">⏳</span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Checking approval status...
          </p>
        </div>
      )}

      {!isLoadingAllowance && needsApproval && !allowanceError && (
        <div className="pt-3 border-t border-blue-200 dark:border-blue-800 space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-600 dark:text-yellow-400 text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You need to approve the contract to spend tokens for the fee.
            </p>
          </div>
          <Button
            type="button"
            onClick={onApprove}
            disabled={isApproving || isApprovalConfirming}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {isApproving || isApprovalConfirming ? "Approving..." : `Approve ${currency} for Fee`}
          </Button>
        </div>
      )}

      {!isLoadingAllowance && allowanceError && (
        <div className="pt-3 border-t border-blue-200 dark:border-blue-800 space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-600 dark:text-yellow-400 text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You need to approve the contract to spend tokens for the fee.
            </p>
          </div>
          <Button
            type="button"
            onClick={onApprove}
            disabled={isApproving || isApprovalConfirming}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {isApproving || isApprovalConfirming ? "Approving..." : `Approve ${currency} for Fee`}
          </Button>
        </div>
      )}

      {isApproved && (
        <div className="flex items-center gap-2 pt-3 border-t border-blue-200 dark:border-blue-800">
          <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
          </div>
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Contract approved. You can create the invoice.
          </p>
        </div>
      )}
    </div>
  );
}
