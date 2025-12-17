import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi";
import { parseUnits, decodeEventLog, parseAbiItem } from "viem";
import {
  INVOPAY_CONTRACT_ADDRESS,
  ERC20_ABI,
  USDC_CONTRACT_ADDRESS,
  EURC_CONTRACT_ADDRESS,
} from "@/lib/constants";
import { INVOPAY_ABI } from "@/lib/contract-abi";
import type { Invoice } from "@backend/lib/supabase";
import { getTransactionReceipt, calculateGasCost } from "@backend/lib/services/contract.service";
import { getPayInvoiceArgs } from "@backend/lib/services/invoice.service";
import {
  updateInvoicePayment,
  updateInvoice,
  updateInvoicePayerAddress,
} from "@backend/lib/services/invoice-db.service";
import {
  getDecimalsArgs,
  getAllowanceArgs,
  getBalanceArgs,
  needsApproval,
  parseTokenAmount,
  getApproveArgs,
} from "@backend/lib/services/token.service";

export function usePayInvoice(
  invoice: Invoice | null,
  invoiceIdBytes32: `0x${string}` | undefined,
  onPaymentSuccess?: () => void
) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [transferHash, setTransferHash] = useState<`0x${string}` | undefined>();
  const [payerAddressAtPayment, setPayerAddressAtPayment] = useState<string | null>(null);

  const tokenAddress = invoice?.currency === "USDC" ? USDC_CONTRACT_ADDRESS : EURC_CONTRACT_ADDRESS;

  const decimalsArgs =
    invoice && tokenAddress ? getDecimalsArgs(tokenAddress as `0x${string}`) : undefined;

  const { data: decimals } = useReadContract({
    ...decimalsArgs,
    query: {
      enabled: !!invoice,
    },
  });

  const allowanceArgs =
    address && INVOPAY_CONTRACT_ADDRESS && tokenAddress
      ? getAllowanceArgs({
          tokenAddress: tokenAddress as `0x${string}`,
          owner: address as `0x${string}`,
        })
      : undefined;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...allowanceArgs,
    query: {
      enabled: !!address && !!invoice && !!INVOPAY_CONTRACT_ADDRESS,
    },
  });

  const balanceArgs =
    address && tokenAddress
      ? getBalanceArgs(tokenAddress as `0x${string}`, address as `0x${string}`)
      : undefined;

  const { data: balance } = useReadContract({
    ...balanceArgs,
    query: {
      enabled: !!address && !!invoice && !!tokenAddress,
    },
  });

  const { data: onChainInvoice } = useReadContract({
    address: INVOPAY_CONTRACT_ADDRESS as `0x${string}`,
    abi: INVOPAY_ABI,
    functionName: "getInvoice",
    args: invoiceIdBytes32 ? [invoiceIdBytes32] : undefined,
    query: {
      enabled: !!invoiceIdBytes32 && !!INVOPAY_CONTRACT_ADDRESS,
    },
  });

  const {
    writeContract: writeApproval,
    data: approvalData,
    isPending: isApproving,
  } = useWriteContract();

  const { isLoading: isApprovalConfirming, data: approvalReceipt } = useWaitForTransactionReceipt({
    hash: approvalData,
  });

  const {
    writeContract: writePayInvoice,
    data: payInvoiceData,
    isPending: isPaying,
    error: payError,
    isError: isPayError,
  } = useWriteContract();

  const {
    isLoading: isPaymentConfirming,
    data: paymentReceipt,
    error: paymentReceiptError,
    isError: isPaymentReceiptError,
  } = useWaitForTransactionReceipt({
    hash: payInvoiceData,
  });

  const needsApprovalCheck =
    invoice &&
    decimals &&
    typeof decimals === "number" &&
    allowance !== undefined &&
    allowance !== null &&
    typeof allowance === "bigint"
      ? needsApproval(allowance, parseUnits(invoice.amount.toString(), decimals))
      : false;

  const handleApprove = async () => {
    if (
      !invoice ||
      !address ||
      !decimals ||
      typeof decimals !== "number" ||
      !INVOPAY_CONTRACT_ADDRESS
    )
      return;

    const amount = parseTokenAmount(invoice.amount, decimals);
    const approveArgs = getApproveArgs({
      tokenAddress: tokenAddress as `0x${string}`,
      amount,
    });

    writeApproval(approveArgs);
  };

  const handlePayInvoice = async () => {
    if (!invoice || !invoiceIdBytes32 || !INVOPAY_CONTRACT_ADDRESS) {
      alert("Contract not configured or invoice not found");
      return;
    }

    if (
      invoice &&
      decimals &&
      typeof decimals === "number" &&
      balance !== undefined &&
      typeof balance === "bigint"
    ) {
      const invoiceAmount = parseTokenAmount(invoice.amount, decimals);
      if (balance < invoiceAmount) {
        alert(
          `Insufficient balance. You need ${invoice.amount} ${invoice.currency} to pay this invoice, but you only have ${(Number(balance) / Math.pow(10, decimals)).toFixed(6)} ${invoice.currency}.`
        );
        return;
      }
    } else if (
      invoice &&
      decimals &&
      typeof decimals === "number" &&
      (balance === undefined || balance === null)
    ) {
      alert("Unable to check your balance. Please try again.");
      return;
    }

    if (address) {
      setPayerAddressAtPayment(String(address).toLowerCase());
    }

    const payArgs = getPayInvoiceArgs(invoice.id) as unknown as {
      address: `0x${string}`;
      abi: typeof INVOPAY_ABI;
      functionName: "payInvoice";
      args: readonly [`0x${string}`];
    };
    writePayInvoice(payArgs);
  };

  useWatchContractEvent({
    address: INVOPAY_CONTRACT_ADDRESS as `0x${string}`,
    abi: INVOPAY_ABI,
    eventName: "InvoicePaid",
    onLogs: async (logs) => {
      const relevantLog = logs.find(
        (log) => log.args.invoiceId?.toLowerCase() === invoiceIdBytes32?.toLowerCase()
      );
      if (relevantLog && invoice) {
        const payerAddress = relevantLog.args.payer;
        if (!payerAddress) return;

        const payerAddressLower = String(payerAddress).toLowerCase();

        let paymentGasCost: number | undefined = undefined;
        try {
          if (relevantLog.transactionHash && publicClient) {
            const receipt = await getTransactionReceipt(relevantLog.transactionHash);
            paymentGasCost = calculateGasCost(receipt);
          }
        } catch (error) {}

        try {
          await updateInvoicePayment(
            invoice.id,
            relevantLog.transactionHash || "",
            payerAddressLower,
            paymentGasCost
          );
          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
        } catch (updateError) {
        }
      }
    },
  });

  useEffect(() => {
    if (approvalReceipt) {
      refetchAllowance();
    }
  }, [approvalReceipt, refetchAllowance]);

  useEffect(() => {
    if (paymentReceipt && invoice && paymentReceipt.status === "success") {
      setTransferHash(paymentReceipt.transactionHash);

      (async () => {
        const paymentGasCost = calculateGasCost(paymentReceipt);
        
        const payerFromStored = payerAddressAtPayment;
        const payerFromCurrent = address ? String(address).toLowerCase() : null;
        let payerFromEvent: string | null = null;

        try {
          if (paymentReceipt.logs && invoiceIdBytes32 && INVOPAY_CONTRACT_ADDRESS) {
            const invoicePaidEventAbi = parseAbiItem(
              "event InvoicePaid(bytes32 indexed invoiceId, address indexed payer, address indexed receiver, uint256 amount, address tokenAddress)"
            );

            for (const log of paymentReceipt.logs) {
              if (log.address?.toLowerCase() !== INVOPAY_CONTRACT_ADDRESS.toLowerCase()) {
                continue;
              }

              try {
                const decoded = decodeEventLog({
                  abi: [invoicePaidEventAbi],
                  data: log.data,
                  topics: log.topics,
                });

                if (decoded.args.invoiceId?.toLowerCase() === invoiceIdBytes32.toLowerCase()) {
                  payerFromEvent = String(decoded.args.payer).toLowerCase();
                  break;
                }
              } catch (error) {
                continue;
              }
            }
          }
        } catch (error) {}

        const payerToUse = payerFromEvent || payerFromStored || payerFromCurrent;

        if (!payerToUse) {
          try {
            await updateInvoice(invoice.id, {
              status: "paid",
              transaction_hash: paymentReceipt.transactionHash,
              paid_at: new Date().toISOString(),
              gas_cost_payment: paymentGasCost,
            });
            if (onPaymentSuccess) {
              setTimeout(() => onPaymentSuccess(), 1000);
            }
          } catch (updateError) {
            console.error("Failed to update invoice:", updateError);
          }
          return;
        }

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await updateInvoicePayment(
              invoice.id,
              paymentReceipt.transactionHash,
              payerToUse,
              paymentGasCost
            );
            if (onPaymentSuccess) {
              setTimeout(() => onPaymentSuccess(), 1000);
            }
            return;
          } catch (updateError) {
            if (attempt === 2) {
              try {
                await updateInvoice(invoice.id, {
                  status: "paid",
                  transaction_hash: paymentReceipt.transactionHash,
                  paid_at: new Date().toISOString(),
                  payer_address: payerToUse,
                  gas_cost_payment: paymentGasCost,
                });
                if (onPaymentSuccess) {
                  setTimeout(() => onPaymentSuccess(), 1000);
                }
              } catch (fallbackError) {
              }
            } else {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
      })();
    }
  }, [paymentReceipt, invoice, invoiceIdBytes32, address, payerAddressAtPayment, onPaymentSuccess]);

  return {
    decimals,
    allowance,
    balance,
    onChainInvoice,
    needsApproval: needsApprovalCheck,
    isApproving,
    isApprovalConfirming,
    isPaying,
    isPaymentConfirming,
    isPayError,
    payError,
    isPaymentReceiptError,
    paymentReceiptError,
    transferHash,
    handleApprove,
    handlePayInvoice,
  };
}
