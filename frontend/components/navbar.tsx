"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ui/theme-toggle";
import { PAYZED_CONTRACT_ADDRESS } from "@/lib/constants";
import { PAYZED_ABI } from "@/lib/contract-abi";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const { isConnected, address } = useAccount();
  const [isOwner, setIsOwner] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: contractOwner } = useReadContract({
    address: PAYZED_CONTRACT_ADDRESS as `0x${string}`,
    abi: PAYZED_ABI,
    functionName: "owner",
    query: {
      enabled: !!PAYZED_CONTRACT_ADDRESS && isConnected,
    },
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setIsOwner(false);
      return;
    }
    if (contractOwner && address) {
      const ownerAddress = contractOwner as `0x${string}`;
      setIsOwner(ownerAddress.toLowerCase() === address.toLowerCase());
    } else {
      setIsOwner(false);
    }
  }, [contractOwner, address, isConnected]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="border-b border-white/10 shadow-sm" style={{ backgroundColor: '#020918' }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity overflow-visible">
            <Image
              src="/logo-payzed.png"
              alt="PayZed Logo"
              width={120}
              height={40}
              className="h-10 w-auto max-h-10"
              priority
              unoptimized
            />
          </Link>
          
          <div className="hidden md:flex items-center gap-4">
            {isConnected && (
              <>
                <Link href="/invoices">
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">Invoices</Button>
                </Link>
                <Link href="/bring-usdc">
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">Bring USDC</Button>
                </Link>
                <Link href="/smart-stable-swap">
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">Smart Stable Swap</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">Dashboard</Button>
                </Link>
              </>
            )}
            {isConnected && isOwner && (
              <Link href="/owner-dashboard">
                <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">Owner Dashboard</Button>
              </Link>
            )}
            <ThemeToggle />
            <ConnectButton chainStatus="none" />
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              className="text-white hover:text-white hover:bg-white/10"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-blue-600/20 pt-4 space-y-3">
            {isConnected && (
              <>
                <Link href="/invoices" onClick={closeMobileMenu}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10">
                    Invoices
                  </Button>
                </Link>
                <Link href="/bring-usdc" onClick={closeMobileMenu}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10">
                    Bring USDC
                  </Button>
                </Link>
                <Link href="/smart-stable-swap" onClick={closeMobileMenu}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10">
                    Smart Stable Swap
                  </Button>
                </Link>
                <Link href="/dashboard" onClick={closeMobileMenu}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10">
                    Dashboard
                  </Button>
                </Link>
              </>
            )}
            {isConnected && isOwner && (
              <Link href="/owner-dashboard" onClick={closeMobileMenu}>
                <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10">
                  Owner Dashboard
                </Button>
              </Link>
            )}
            <div className="pt-2">
              <ConnectButton chainStatus="none" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
