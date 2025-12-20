import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { formatUnits, parseAbiItem } from "viem";
import {
  PAYZED_CONTRACT_ADDRESS,
  PAYZED_FEES_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  EURC_CONTRACT_ADDRESS,
} from "@/lib/constants";
import { PAYZED_ABI, PAYZED_FEES_ABI } from "@/lib/contract-abi";

export function useOwnerDashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const publicClient = usePublicClient();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [usdcFees, setUsdcFees] = useState<string>("0");
  const [eurcFees, setEurcFees] = useState<string>("0");
  const [usdcWithdrawn, setUsdcWithdrawn] = useState<string>("0");
  const [eurcWithdrawn, setEurcWithdrawn] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [loadingUsdcWithdrawn, setLoadingUsdcWithdrawn] = useState(false);
  const [loadingEurcWithdrawn, setLoadingEurcWithdrawn] = useState(false);

  const { data: contractOwner } = useReadContract({
    address: PAYZED_CONTRACT_ADDRESS as `0x${string}`,
    abi: PAYZED_ABI,
    functionName: "owner",
    query: {
      enabled: !!PAYZED_CONTRACT_ADDRESS && isConnected,
    },
  });

  const {
    data: usdcFeesRaw,
    refetch: refetchUsdcFees,
    isLoading: isLoadingUsdcFees,
  } = useReadContract({
    address: PAYZED_FEES_CONTRACT_ADDRESS as `0x${string}`,
    abi: PAYZED_FEES_ABI,
    functionName: "getAccumulatedFees",
    args: [USDC_CONTRACT_ADDRESS as `0x${string}`],
    query: {
      enabled: !!PAYZED_FEES_CONTRACT_ADDRESS && isConnected && isOwner === true,
      refetchInterval: 30000,
    },
  });

  const {
    data: eurcFeesRaw,
    refetch: refetchEurcFees,
    isLoading: isLoadingEurcFees,
  } = useReadContract({
    address: PAYZED_FEES_CONTRACT_ADDRESS as `0x${string}`,
    abi: PAYZED_FEES_ABI,
    functionName: "getAccumulatedFees",
    args: [EURC_CONTRACT_ADDRESS as `0x${string}`],
    query: {
      enabled: !!PAYZED_FEES_CONTRACT_ADDRESS && isConnected && isOwner === true,
      refetchInterval: 30000,
    },
  });

  const {
    writeContract: writeWithdrawUsdc,
    data: withdrawUsdcHash,
    isPending: isWithdrawingUsdc,
  } = useWriteContract();

  const {
    writeContract: writeWithdrawEurc,
    data: withdrawEurcHash,
    isPending: isWithdrawingEurc,
  } = useWriteContract();

  const { isLoading: isUsdcConfirming } = useWaitForTransactionReceipt({
    hash: withdrawUsdcHash,
  });

  const { isLoading: isEurcConfirming } = useWaitForTransactionReceipt({
    hash: withdrawEurcHash,
  });

  const refetchWithdrawnFeesForToken = useCallback(
    async (
      tokenAddress: string,
      setLoading: (loading: boolean) => void,
      setValue: (value: string) => void
    ) => {
      if (!publicClient || !PAYZED_FEES_CONTRACT_ADDRESS) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const totalWithdrawn = await publicClient.readContract({
          address: PAYZED_FEES_CONTRACT_ADDRESS as `0x${string}`,
          abi: PAYZED_FEES_ABI,
          functionName: "getTotalWithdrawn",
          args: [tokenAddress as `0x${string}`],
        });

        const formatted = formatUnits(totalWithdrawn, 6);
        setValue(formatted);
      } catch (error: any) {
        setValue("0");
      } finally {
        setLoading(false);
      }
    },
    [publicClient]
  );

  const refetchWithdrawnFees = useCallback(async () => {
    await Promise.all([
      refetchWithdrawnFeesForToken(
        USDC_CONTRACT_ADDRESS,
        setLoadingUsdcWithdrawn,
        setUsdcWithdrawn
      ),
      refetchWithdrawnFeesForToken(
        EURC_CONTRACT_ADDRESS,
        setLoadingEurcWithdrawn,
        setEurcWithdrawn
      ),
    ]);
  }, [refetchWithdrawnFeesForToken]);

  const refetchUsdcWithdrawn = useCallback(async () => {
    await refetchWithdrawnFeesForToken(
      USDC_CONTRACT_ADDRESS,
      setLoadingUsdcWithdrawn,
      setUsdcWithdrawn
    );
  }, [refetchWithdrawnFeesForToken]);

  const refetchEurcWithdrawn = useCallback(async () => {
    await refetchWithdrawnFeesForToken(
      EURC_CONTRACT_ADDRESS,
      setLoadingEurcWithdrawn,
      setEurcWithdrawn
    );
  }, [refetchWithdrawnFeesForToken]);

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/login");
      return;
    }

    if (contractOwner && address) {
      const ownerAddress = contractOwner as `0x${string}`;
      const isOwnerCheck = ownerAddress.toLowerCase() === address.toLowerCase();
      setIsOwner(isOwnerCheck);

      if (!isOwnerCheck) {
        router.push("/invoices");
      }
    }
  }, [contractOwner, address, isConnected, router]);

  useEffect(() => {
    if (usdcFeesRaw !== undefined && usdcFeesRaw !== null) {
      if (typeof usdcFeesRaw === "bigint") {
        const formatted = formatUnits(usdcFeesRaw, 6);
        setUsdcFees(formatted);
      } else {
        setUsdcFees("0");
      }
    } else if (!isLoadingUsdcFees && isOwner === true) {
      setUsdcFees("0");
    }
  }, [usdcFeesRaw, isLoadingUsdcFees, isOwner]);

  useEffect(() => {
    if (eurcFeesRaw !== undefined && eurcFeesRaw !== null) {
      if (typeof eurcFeesRaw === "bigint") {
        const formatted = formatUnits(eurcFeesRaw, 6);
        setEurcFees(formatted);
      } else {
        setEurcFees("0");
      }
    } else if (!isLoadingEurcFees && isOwner === true) {
      setEurcFees("0");
    }
  }, [eurcFeesRaw, isLoadingEurcFees, isOwner]);

  useEffect(() => {
    if (isOwner !== null) {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner || !publicClient || !PAYZED_FEES_CONTRACT_ADDRESS) {
      return;
    }
    refetchWithdrawnFees();
  }, [isOwner, publicClient, refetchWithdrawnFees]);

  useEffect(() => {
    if (withdrawUsdcHash && !isUsdcConfirming) {
      refetchUsdcFees();
      setTimeout(() => {
        refetchWithdrawnFees();
      }, 2000);
    }
  }, [withdrawUsdcHash, isUsdcConfirming, refetchUsdcFees, refetchWithdrawnFees]);

  useEffect(() => {
    if (withdrawEurcHash && !isEurcConfirming) {
      refetchEurcFees();
      setTimeout(() => {
        refetchWithdrawnFees();
      }, 2000);
    }
  }, [withdrawEurcHash, isEurcConfirming, refetchEurcFees, refetchWithdrawnFees]);

  useEffect(() => {
    if (isOwner === true) {
      refetchUsdcFees();
      refetchEurcFees();

      const interval = setInterval(() => {
        refetchUsdcFees();
        refetchEurcFees();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOwner, refetchUsdcFees, refetchEurcFees]);

  const handleWithdrawUsdc = () => {
    if (!address || !PAYZED_FEES_CONTRACT_ADDRESS) return;

    writeWithdrawUsdc({
      address: PAYZED_FEES_CONTRACT_ADDRESS as `0x${string}`,
      abi: PAYZED_FEES_ABI,
      functionName: "withdrawFees",
      args: [USDC_CONTRACT_ADDRESS as `0x${string}`, address as `0x${string}`],
    });
  };

  const handleWithdrawEurc = () => {
    if (!address || !PAYZED_FEES_CONTRACT_ADDRESS) return;

    writeWithdrawEurc({
      address: PAYZED_FEES_CONTRACT_ADDRESS as `0x${string}`,
      abi: PAYZED_FEES_ABI,
      functionName: "withdrawFees",
      args: [EURC_CONTRACT_ADDRESS as `0x${string}`, address as `0x${string}`],
    });
  };

  return {
    isOwner,
    usdcFees,
    eurcFees,
    usdcWithdrawn,
    eurcWithdrawn,
    loading,
    loadingUsdcWithdrawn,
    loadingEurcWithdrawn,
    contractOwner,
    isWithdrawingUsdc,
    isUsdcConfirming,
    isWithdrawingEurc,
    isEurcConfirming,
    handleWithdrawUsdc,
    handleWithdrawEurc,
    refetchUsdcWithdrawn,
    refetchEurcWithdrawn,
  };
}
