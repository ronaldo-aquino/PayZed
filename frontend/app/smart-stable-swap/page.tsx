"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface ExchangeRate {
  pair: string;
  currency: string;
  currencyCode: string;
  flag: string;
  currentRate: number;
  change: number;
  changePercent: number;
  volume: string;
  high24h: number;
  low24h: number;
}

const mockExchangeRates: ExchangeRate[] = [
  {
    pair: "USDC/BRLA",
    currency: "Brazilian Real",
    currencyCode: "BRLA",
    flag: "🇧🇷",
    currentRate: 5.4820,
    change: 0.0125,
    changePercent: 0.23,
    volume: "3.8M",
    high24h: 5.4950,
    low24h: 5.4680,
  },
  {
    pair: "USDC/VNDC",
    currency: "Vietnamese Dong",
    currencyCode: "VNDC",
    flag: "🇻🇳",
    currentRate: 25380,
    change: -25.5,
    changePercent: -0.10,
    volume: "1.2M",
    high24h: 25420,
    low24h: 25350,
  },
  {
    pair: "USDC/KRW",
    currency: "Korean Won",
    currencyCode: "KRW",
    flag: "🇰🇷",
    currentRate: 1385.50,
    change: -2.30,
    changePercent: -0.17,
    volume: "2.1M",
    high24h: 1390.20,
    low24h: 1382.80,
  },
  {
    pair: "USDC/GBP",
    currency: "British Pound",
    currencyCode: "GBP",
    flag: "🇬🇧",
    currentRate: 0.7915,
    change: 0.0012,
    changePercent: 0.15,
    volume: "4.5M",
    high24h: 0.7930,
    low24h: 0.7895,
  },
  {
    pair: "USDC/JPY",
    currency: "Japanese Yen",
    currencyCode: "JPY",
    flag: "🇯🇵",
    currentRate: 157.85,
    change: 0.45,
    changePercent: 0.29,
    volume: "5.2M",
    high24h: 158.10,
    low24h: 157.20,
  },
  {
    pair: "USDC/CNY",
    currency: "Chinese Yuan",
    currencyCode: "CNY",
    flag: "🇨🇳",
    currentRate: 7.2480,
    change: -0.0120,
    changePercent: -0.17,
    volume: "1.8M",
    high24h: 7.2650,
    low24h: 7.2380,
  },
];

export default function SmartStableSwapPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>(mockExchangeRates);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/login");
      return;
    }
  }, [isConnected, address, router]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setExchangeRates((prev) =>
        prev.map((rate) => ({
          ...rate,
          currentRate: rate.currentRate + (Math.random() - 0.5) * rate.currentRate * 0.001,
          changePercent: rate.changePercent + (Math.random() - 0.5) * 0.1,
        }))
      );
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatRate = (rate: number) => {
    if (rate >= 1000) {
      return rate.toFixed(0);
    } else if (rate >= 1) {
      return rate.toFixed(4);
    } else {
      return rate.toFixed(4);
    }
  };

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 py-8 md:py-12">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Smart Stable Swap
              </h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm text-muted-foreground">
                <span className="hidden sm:inline">Last Update: </span>
                <span>{formatTime(lastUpdate)}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exchangeRates.map((rate) => {
              const isPositive = rate.changePercent >= 0;
              const TrendIcon = isPositive ? TrendingUp : TrendingDown;

              return (
                <Card
                  key={rate.pair}
                  className="group border border-border/60 shadow-md hover:shadow-xl hover:border-primary/40 transition-all duration-300 bg-gradient-to-br from-card via-card/95 to-muted/5 backdrop-blur-sm overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-4 sm:p-6 relative z-10">
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-muted/30 flex items-center justify-center text-2xl sm:text-3xl shadow-inner border border-primary/10 flex-shrink-0">
                            {rate.flag}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">{rate.pair}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium break-words">{rate.currency}</p>
                            <div className="pt-1">
                              <span className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/95 to-foreground/90 bg-clip-text text-transparent break-all">
                                {formatRate(rate.currentRate)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-2 sm:gap-2.5 flex-shrink-0">
                          <div
                            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold backdrop-blur-sm ${
                              isPositive
                                ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shadow-sm"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-sm"
                            }`}
                          >
                            <TrendIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm font-bold">
                              {isPositive ? "+" : ""}
                              {rate.changePercent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex items-end justify-center gap-1 sm:gap-1.5 h-10 sm:h-12 w-fit">
                            {[...Array(5)].map((_, i) => {
                              const baseHeight = 30;
                              const randomVariation = Math.random() * 45;
                              const height = baseHeight + randomVariation;
                              return (
                                <div
                                  key={i}
                                  className={`w-2 sm:w-2.5 rounded-t transition-all duration-500 hover:opacity-80 ${
                                    isPositive
                                      ? "bg-gradient-to-t from-green-500 to-green-400 dark:from-green-400 dark:to-green-300"
                                      : "bg-gradient-to-t from-red-500 to-red-400 dark:from-red-400 dark:to-red-300"
                                  }`}
                                  style={{
                                    height: `${height}%`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 sm:pt-5 border-t border-border/60 space-y-3 bg-muted/20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 sm:py-4 rounded-b-lg">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Volume</span>
                            <p className="text-xs sm:text-sm font-bold text-foreground break-words">{rate.volume}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">High</span>
                            <p className="text-xs sm:text-sm font-semibold text-foreground break-all">{formatRate(rate.high24h)}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Low</span>
                            <p className="text-xs sm:text-sm font-semibold text-foreground break-all">{formatRate(rate.low24h)}</p>
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-11 sm:h-12 text-sm sm:text-base font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 bg-gradient-to-r from-primary to-primary/90" 
                        variant="default"
                        onClick={() => setIsModalOpen(true)}
                      >
                        Swap
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coming Soon</DialogTitle>
            <DialogDescription>
              The swap functionality will be available soon. We're working hard to bring you the best stable swap experience.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsModalOpen(false)} variant="default">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

