import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Wallet, BarChart3, Shield, Zap, Globe, ArrowRight, ArrowLeftRight, Coins, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <section className="py-20 sm:py-24 md:py-32 lg:py-40">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                <Shield className="w-4 h-4" />
                <span>Powered by Arc Testnet</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] leading-tight">
                Invopay
              </h1>
              
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                A powerful invoice creation and management platform with cross-chain USDC transfers and smart stable swap capabilities on the Arc Testnet.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 h-auto group">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 h-auto">
                    Connect Wallet
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-20 md:py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">Create Invoices</CardTitle>
                  <CardDescription className="text-base">
                    Easily create invoices with custom amounts and currency selection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Generate professional invoices in seconds. Choose between USDC or EURC and set
                    your desired payment amount with detailed descriptions.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">Web3 Payments</CardTitle>
                  <CardDescription className="text-base">
                    Accept payments directly through blockchain transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Receive payments in stablecoins on Arc Testnet. Desktop and mobile wallet support
                    with QR code payments for seamless transactions.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">Manage Everything</CardTitle>
                  <CardDescription className="text-base">
                    Track all your invoices from a centralized dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    View payment status, transaction history, and manage all your invoices in one
                    place with real-time updates.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <ArrowLeftRight className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">Bring USDC</CardTitle>
                  <CardDescription className="text-base">
                    Transfer USDC from other networks to Arc Testnet using CCTP
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Seamlessly bridge USDC from Ethereum, Base, Polygon, or Sepolia to Arc Testnet using Circle's Cross-Chain Transfer Protocol.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-muted/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                    Coming Soon
                  </span>
                </div>
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 opacity-60">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">Smart Stable Swap</CardTitle>
                  <CardDescription className="text-base">
                    Swap stablecoins with on-chain FX rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Exchange between different stablecoins using real-time on-chain exchange rates. Powered by StableFX protocol.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">Programmable Money Made Simple</CardTitle>
                  <CardDescription className="text-base">
                    Access programmable money without technical knowledge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We make programmable money accessible to everyone. No coding required - create invoices, receive payments, and manage your finances with an intuitive interface.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="py-16 sm:py-20 md:py-24 border-t border-border/50">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                Why Choose Invopay?
              </h2>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
                Built for the future of decentralized payments
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-4 p-6 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Create and process invoices in seconds with instant blockchain confirmation.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Secure & Transparent</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    All transactions are recorded on-chain with full transparency and immutability.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Global Payments</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Accept payments in USDC and EURC from anywhere in the world, 24/7.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Low Fees</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Only 0.05% platform fee per invoice, making it cost-effective for businesses.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
