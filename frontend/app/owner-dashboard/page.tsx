"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeeCard } from "@/components/owner-dashboard/fee-card";
import { INVOPAY_CONTRACT_ADDRESS, INVOPAY_FEES_CONTRACT_ADDRESS } from "@/lib/constants";
import { useOwnerDashboard } from "@/hooks/useOwnerDashboard";

export default function OwnerDashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const {
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
  } = useOwnerDashboard();

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/login");
    }
  }, [isConnected, address, router]);

  if (!isConnected || !address) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (isOwner === false) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="space-y-3 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Owner Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              View accumulated fees from invoice creation
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FeeCard
              title="USDC Fees"
              description="Accumulated fees in USDC"
              availableAmount={usdcFees}
              withdrawnAmount={usdcWithdrawn}
              isLoadingWithdrawn={loadingUsdcWithdrawn}
              isWithdrawing={isWithdrawingUsdc}
              isConfirming={isUsdcConfirming}
              onWithdraw={handleWithdrawUsdc}
              onRefresh={refetchUsdcWithdrawn}
              iconColor="text-blue-600 dark:text-blue-400 from-blue-500/10 to-blue-600/20 dark:from-blue-500/20 dark:to-blue-600/30"
              bgGradient="to-blue-50/30 dark:to-blue-950/10"
              buttonColor="bg-blue-600 hover:bg-blue-700"
            />
            <FeeCard
              title="EURC Fees"
              description="Accumulated fees in EURC"
              availableAmount={eurcFees}
              withdrawnAmount={eurcWithdrawn}
              isLoadingWithdrawn={loadingEurcWithdrawn}
              isWithdrawing={isWithdrawingEurc}
              isConfirming={isEurcConfirming}
              onWithdraw={handleWithdrawEurc}
              onRefresh={refetchEurcWithdrawn}
              iconColor="text-purple-600 dark:text-purple-400 from-purple-500/10 to-purple-600/20 dark:from-purple-500/20 dark:to-purple-600/30"
              bgGradient="to-purple-50/30 dark:to-purple-950/10"
              buttonColor="bg-purple-600 hover:bg-purple-700"
            />
          </div>

          <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-muted/30">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/60">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Fee Rate
                  </span>
                  <span className="text-sm font-bold">0.05% per invoice</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Invoice Contract Address
                  </p>
                  <code className="block text-xs bg-muted px-3 py-2 rounded-md border font-mono break-all">
                    {INVOPAY_CONTRACT_ADDRESS}
                  </code>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fees Contract Address
                  </p>
                  <code className="block text-xs bg-muted px-3 py-2 rounded-md border font-mono break-all">
                    {INVOPAY_FEES_CONTRACT_ADDRESS || "Not configured"}
                  </code>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Owner Address
                  </p>
                  <code className="block text-xs bg-muted px-3 py-2 rounded-md border font-mono break-all">
                    {contractOwner as string}
                  </code>
                </div>
                <div className="mt-4 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Fees are automatically accumulated when invoices are created. Use the
                    contract&apos;s{" "}
                    <code className="bg-background px-1.5 py-0.5 rounded text-primary font-mono">
                      withdrawFees
                    </code>{" "}
                    function to withdraw.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
