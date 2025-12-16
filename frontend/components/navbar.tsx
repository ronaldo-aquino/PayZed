"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ui/theme-toggle";
import { INVOPAY_CONTRACT_ADDRESS } from "@/lib/constants";
import { INVOPAY_ABI } from "@/lib/contract-abi";

export function Navbar() {
  const { isConnected, address } = useAccount();
  const [isOwner, setIsOwner] = useState(false);

  const { data: contractOwner } = useReadContract({
    address: INVOPAY_CONTRACT_ADDRESS as `0x${string}`,
    abi: INVOPAY_ABI,
    functionName: "owner",
    query: {
      enabled: !!INVOPAY_CONTRACT_ADDRESS && isConnected,
    },
  });

  useEffect(() => {
    if (contractOwner && address) {
      const ownerAddress = contractOwner as `0x${string}`;
      setIsOwner(ownerAddress.toLowerCase() === address.toLowerCase());
    }
  }, [contractOwner, address]);

  return (
    <nav className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold">
            Invopay
          </Link>
          <div className="flex items-center gap-4">
            {isConnected && (
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
            )}
            {isOwner && (
              <Link href="/owner-dashboard">
                <Button variant="ghost">Owner Dashboard</Button>
              </Link>
            )}
            <ThemeToggle />
            <ConnectButton chainStatus="none" />
          </div>
        </div>
      </div>
    </nav>
  );
}
