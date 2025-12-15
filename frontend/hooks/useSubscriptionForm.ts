"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { isAddress } from "viem";

const subscriptionSchema = z.object({
  amount: z.number().positive("Amount must be positive").min(0.01, "Amount must be at least 0.01"),
  currency: z.enum(["USDC", "EURC"], {
    required_error: "Please select a currency",
  }),
  receiver_wallet_address: z
    .string()
    .min(1, "Receiver address is required")
    .refine((val) => isAddress(val), "Invalid Ethereum address"),
  period_days: z.number().int().positive("Period must be positive").min(1, "Period must be at least 1 day"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

export function useSubscriptionForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
  });

  const amount = watch("amount");
  const currency = watch("currency");
  const [watchAmount, setWatchAmount] = useState<number | null>(null);
  const [watchCurrency, setWatchCurrency] = useState<"USDC" | "EURC" | "">("");

  useEffect(() => {
    const numAmount = typeof amount === "number" && !isNaN(amount) ? amount : null;
    setWatchAmount(numAmount);
    setWatchCurrency(currency as "USDC" | "EURC" | "");
  }, [amount, currency]);

  const feeAmount = useMemo(() => {
    if (!watchAmount || isNaN(watchAmount) || watchAmount <= 0) return 0;
    const calculated = watchAmount * 0.0005;
    return isNaN(calculated) ? 0 : calculated;
  }, [watchAmount]);

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    watchAmount,
    watchCurrency,
    feeAmount,
  };
}


