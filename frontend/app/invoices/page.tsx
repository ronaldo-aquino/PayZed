"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Plus, Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { InvoiceCard } from "@/components/invoices/invoice-card";
import { InvoiceStatsCard } from "@/components/invoices/invoice-stats-card";
import { InvoiceTabs } from "@/components/invoices/invoice-tabs";
import { EmptyState } from "@/components/invoices/empty-state";
import { LoadingState } from "@/components/invoices/loading-state";
import { getStatusColor } from "@/components/invoices/status-badge";
import { useInvoiceList } from "@/hooks/useInvoiceList";

type TabType = "all" | "paid" | "pending" | "paidByMe";

export default function InvoicesPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    allInvoices,
    paidInvoices,
    pendingInvoices,
    invoicesIPaid,
    totalCounts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useInvoiceList(address);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/login");
    }
  }, [isConnected, address, router]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore[activeTab] && !loadingMore && !loading) {
          loadMore(activeTab);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [activeTab, hasMore, loadingMore, loading, loadMore]);

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const currentInvoices =
    activeTab === "all"
      ? allInvoices
      : activeTab === "paid"
        ? paidInvoices
        : activeTab === "pending"
          ? pendingInvoices
          : invoicesIPaid;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Invoices</h1>
              <p className="text-muted-foreground text-lg">Manage all your invoices in one place</p>
            </div>
            <Link href="/create">
              <Button size="lg" className="w-full sm:w-auto">
                <Plus className="mr-2 h-5 w-5" />
                Create Invoice
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InvoiceStatsCard title="All Invoices" count={totalCounts.all} icon="all" />
            <InvoiceStatsCard title="Invoices I Paid" count={totalCounts.paidByMe} icon="paid" />
          </div>

          <InvoiceTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={{
              all: totalCounts.all,
              paid: totalCounts.paid,
              pending: totalCounts.pending,
              paidByMe: totalCounts.paidByMe,
            }}
          />

          {loading ? (
            <LoadingState />
          ) : currentInvoices.length === 0 ? (
            <EmptyState activeTab={activeTab} />
          ) : (
            <>
              <div className="grid gap-4">
                {currentInvoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    address={address}
                    activeTab={activeTab}
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
              {hasMore[activeTab] && (
                <div ref={observerTarget} className="flex justify-center py-8">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading more invoices...</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}


