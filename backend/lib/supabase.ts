import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (typeof window === "undefined") {
    console.warn(
      "⚠️  Missing Supabase environment variables. Using placeholder values for build. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Invoice = {
  id: string;
  user_wallet_address: string;
  receiver_wallet_address: string;
  amount: number;
  currency: "USDC" | "EURC";
  status: "pending" | "paid" | "expired";
  payment_link: string;
  description?: string;
  transaction_hash?: string;
  fee_amount?: number;
  gas_cost?: number;
  gas_cost_creation?: number;
  gas_cost_payment?: number;
  payer_address?: string;
  created_at: string;
  paid_at?: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  subscription_id_bytes32: string;
  creator_wallet_address: string;
  payer_wallet_address: string;
  receiver_wallet_address: string;
  amount: number;
  currency: "USDC" | "EURC";
  period_seconds: number;
  next_payment_due: string;
  paused_at?: string;
  status: "pending" | "active" | "cancelled_by_creator" | "cancelled_by_payer" | "paused";
  description?: string;
  total_payments: number;
  created_at: string;
  updated_at: string;
};
