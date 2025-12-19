"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoiceList } from "@/hooks/useInvoiceList";
import { getAllInvoicesByUser, getPaidInvoicesByUser } from "@backend/lib/services/invoice-db.service";
import type { Invoice } from "@backend/lib/supabase";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const displayLabel = label || payload[0]?.payload?.name || "Invoice Status";
    return (
      <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-md shadow-xl p-3 min-w-[120px]">
        <p className="text-sm font-semibold text-foreground mb-2 pb-2 border-b border-border/50">
          {displayLabel}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {typeof entry.value === "number"
                  ? entry.value.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};


export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [allInvoicesData, setAllInvoicesData] = useState<Invoice[]>([]);
  const [paidInvoicesData, setPaidInvoicesData] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    allInvoices,
    paidInvoices,
    pendingInvoices,
    totalCounts,
    loading,
  } = useInvoiceList(address);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!address) return;
      try {
        setLoadingData(true);
        const [allData, paidData] = await Promise.all([
          getAllInvoicesByUser(address),
          getPaidInvoicesByUser(address),
        ]);
        setAllInvoicesData(allData || []);
        setPaidInvoicesData(paidData || []);
      } catch (error) {
      } finally {
        setLoadingData(false);
      }
    };

    fetchAllData();
  }, [address]);

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/login");
    }
  }, [isConnected, address, router]);

  const totalReceived = useMemo(() => {
    const usdcGross = paidInvoicesData
      .filter((inv) => inv.currency === "USDC")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const eurcGross = paidInvoicesData
      .filter((inv) => inv.currency === "EURC")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    
    const usdcNet = paidInvoicesData
      .filter((inv) => inv.currency === "USDC")
      .reduce((sum, inv) => {
        const amount = Number(inv.amount || 0);
        const fee = Number(inv.fee_amount || 0);
        return sum + (amount - fee);
      }, 0);
    const eurcNet = paidInvoicesData
      .filter((inv) => inv.currency === "EURC")
      .reduce((sum, inv) => {
        const amount = Number(inv.amount || 0);
        const fee = Number(inv.fee_amount || 0);
        return sum + (amount - fee);
      }, 0);

    return { usdcGross, eurcGross, usdcNet, eurcNet };
  }, [paidInvoicesData]);

  const currencyBreakdown = useMemo(() => {
    const usdcPaid = paidInvoicesData
      .filter((inv) => inv.currency === "USDC")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const eurcPaid = paidInvoicesData
      .filter((inv) => inv.currency === "EURC")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return [
      { name: "USDC", value: usdcPaid },
      { name: "EURC", value: eurcPaid },
    ];
  }, [paidInvoicesData]);

  const recentInvoicesList = useMemo(() => {
    const seenIds = new Set<string>();
    const list = allInvoicesData
      .map((inv) => {
        if (seenIds.has(inv.id)) return null;
        seenIds.add(inv.id);
        
        const amount = parseFloat(String(inv.amount || 0));
        if (isNaN(amount) || amount < 0) return null;
        const createdDate = new Date(inv.created_at);
        if (isNaN(createdDate.getTime())) return null;
        const date = createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return {
          id: inv.id,
          uniqueKey: inv.id,
          date,
          dateTime: createdDate.getTime(),
          currency: inv.currency,
          amount: amount,
          status: inv.status,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.dateTime - a.dateTime)
      .slice(0, 10)
      .reverse();
    
    return list;
  }, [allInvoicesData]);

  const recentInvoicesMaxValue = useMemo(() => {
    if (recentInvoicesList.length === 0) return 100;
    const maxAmount = Math.max(...recentInvoicesList.map(inv => inv.amount));
    return maxAmount > 0 ? maxAmount * 1.1 : 100;
  }, [recentInvoicesList]);


  const receivedVsPending = useMemo(() => {
    const usdcReceived = paidInvoicesData
      .filter((inv) => inv.currency === "USDC")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    
    const eurcReceived = paidInvoicesData
      .filter((inv) => inv.currency === "EURC")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const usdcPending = allInvoicesData
      .filter((inv) => inv.currency === "USDC" && inv.status === "pending")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    
    const eurcPending = allInvoicesData
      .filter((inv) => inv.currency === "EURC" && inv.status === "pending")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return [
      { name: "USDC", received: usdcReceived, pending: usdcPending },
      { name: "EURC", received: eurcReceived, pending: eurcPending },
    ];
  }, [paidInvoicesData, allInvoicesData]);

  const averageInvoiceValue = useMemo(() => {
    const usdcInvoices = allInvoicesData.filter((inv) => inv.currency === "USDC");
    const eurcInvoices = allInvoicesData.filter((inv) => inv.currency === "EURC");

    const usdcAvg = usdcInvoices.length > 0
      ? usdcInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0) / usdcInvoices.length
      : 0;

    const eurcAvg = eurcInvoices.length > 0
      ? eurcInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0) / eurcInvoices.length
      : 0;

    return [
      { name: "USDC", average: usdcAvg },
      { name: "EURC", average: eurcAvg },
    ];
  }, [allInvoicesData]);


  const statusDistribution = useMemo(() => {
    const pending = allInvoicesData.filter((inv) => inv.status === "pending").length;
    const paid = allInvoicesData.filter((inv) => inv.status === "paid").length;

    return [
      { name: "Pending", value: pending, fill: "#FFBB28" },
      { name: "Paid", value: paid, fill: "#00C49F" },
    ];
  }, [allInvoicesData]);

  const invoicesComparison = useMemo(() => {
    return [
      { name: "Created", value: allInvoicesData.length },
      { name: "Paid", value: paidInvoicesData.length },
    ];
  }, [allInvoicesData, paidInvoicesData]);

  const conversionRate = useMemo(() => {
    if (allInvoicesData.length === 0) return 0;
    return ((paidInvoicesData.length / allInvoicesData.length) * 100).toFixed(1);
  }, [allInvoicesData, paidInvoicesData]);

  const todayStats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const createdToday = allInvoicesData.filter((inv) => {
      const createdDate = new Date(inv.created_at);
      return createdDate >= todayStart && createdDate < todayEnd;
    }).length;

    const paidToday = paidInvoicesData.filter((inv) => {
      if (!inv.paid_at) return false;
      const paidDate = new Date(inv.paid_at);
      return paidDate >= todayStart && paidDate < todayEnd;
    }).length;

    const receivedTodayUsdc = paidInvoicesData
      .filter((inv) => {
        if (!inv.paid_at || inv.currency !== "USDC") return false;
        const paidDate = new Date(inv.paid_at);
        return paidDate >= todayStart && paidDate < todayEnd;
      })
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const receivedTodayEurc = paidInvoicesData
      .filter((inv) => {
        if (!inv.paid_at || inv.currency !== "EURC") return false;
        const paidDate = new Date(inv.paid_at);
        return paidDate >= todayStart && paidDate < todayEnd;
      })
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return { createdToday, paidToday, receivedTodayUsdc, receivedTodayEurc };
  }, [allInvoicesData, paidInvoicesData]);

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="space-y-8">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground text-lg">Overview of your invoice statistics</p>
            </div>

            {loading || loadingData ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">Loading dashboard data...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle>Today</CardTitle>
                      <CardDescription>Invoices created today</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{todayStats.createdToday}</p>
                      {todayStats.paidToday > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {todayStats.paidToday} paid
                          </p>
                          {todayStats.receivedTodayUsdc > 0 && (
                            <p className="text-sm font-semibold">
                              {todayStats.receivedTodayUsdc.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              USDC
                            </p>
                          )}
                          {todayStats.receivedTodayEurc > 0 && (
                            <p className="text-sm font-semibold">
                              {todayStats.receivedTodayEurc.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              EURC
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>


                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle>Total Invoices</CardTitle>
                      <CardDescription>All invoices created</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{allInvoicesData.length}</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle>Conversion Rate</CardTitle>
                      <CardDescription>Paid vs Created</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{conversionRate}%</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle>Invoice Status</CardTitle>
                      <CardDescription>Distribution of invoice statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                            content={<CustomTooltip />}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle>Invoices Created vs Paid</CardTitle>
                      <CardDescription>Comparison of created and paid invoices</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={invoicesComparison}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                          <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          domain={[0, 'dataMax']}
                        />
                          <Tooltip
                            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                            content={<CustomTooltip />}
                          />
                          <Legend />
                          <Bar dataKey="value" fill="#0088FE" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle>Received vs Pending</CardTitle>
                      <CardDescription>Paid invoices (received) vs pending invoices (to receive)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={receivedVsPending}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                          <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          domain={[0, 'dataMax']}
                        />
                          <Tooltip
                            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                            content={(props: any) => {
                              if (props.active && props.payload && props.payload.length) {
                                return (
                                  <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-md shadow-xl p-3 min-w-[140px]">
                                    <p className="text-sm font-semibold text-foreground mb-2 pb-2 border-b border-border/50">
                                      {props.label}
                                    </p>
                                    <div className="space-y-1.5">
                                      {props.payload.map((entry: any, index: number) => (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between gap-3"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                              {entry.name}:
                                            </span>
                                          </div>
                                          <span className="text-sm font-semibold text-foreground">
                                            {Number(entry.value).toLocaleString(undefined, {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}{" "}
                                            {props.label}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="received" fill="#00C49F" radius={[8, 8, 0, 0]} name="Received" />
                          <Bar dataKey="pending" fill="#FFBB28" radius={[8, 8, 0, 0]} name="Pending" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle>Average Invoice Value</CardTitle>
                      <CardDescription>Average value per invoice by currency</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={averageInvoiceValue}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                          <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          domain={[0, 'dataMax']}
                        />
                          <Tooltip
                            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                            content={(props: any) => {
                              if (props.active && props.payload && props.payload.length) {
                                const data = props.payload[0].payload;
                                return (
                                  <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-md shadow-xl p-3 min-w-[140px]">
                                    <p className="text-sm font-semibold text-foreground mb-2 pb-2 border-b border-border/50">
                                      {data.name}
                                    </p>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-xs text-muted-foreground">Average:</span>
                                      <span className="text-sm font-semibold text-foreground">
                                        {Number(data.average).toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}{" "}
                                        {data.name}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="average" radius={[8, 8, 0, 0]}>
                            {averageInvoiceValue.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.name === "USDC" ? "#0088FE" : "#00C49F"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                    <CardDescription>Values of the last 10 invoices created</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={recentInvoicesList} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="uniqueKey"
                          tickFormatter={(value) => {
                            const item = recentInvoicesList.find(inv => inv.uniqueKey === value);
                            return item ? item.date : value;
                          }}
                          stroke="hsl(var(--muted-foreground))"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          type="number"
                          domain={[0, recentInvoicesMaxValue]}
                          allowDecimals={true}
                          tickFormatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                          content={(props: any) => {
                            if (props.active && props.payload && props.payload.length) {
                              const data = props.payload[0].payload;
                              return (
                                <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-md shadow-xl p-3 min-w-[180px]">
                                  <p className="text-sm font-semibold text-foreground mb-2 pb-2 border-b border-border/50">
                                    {data.date} - {data.currency}
                                  </p>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-xs text-muted-foreground">Amount:</span>
                                      <span className="text-sm font-semibold text-foreground">
                                        {Number(data.amount).toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}{" "}
                                        {data.currency}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-xs text-muted-foreground">Status:</span>
                                      <span className="text-sm font-semibold text-foreground capitalize">
                                        {data.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]} name="Amount">
                          {recentInvoicesList.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.currency === "USDC" ? "#0088FE" : "#00C49F"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
