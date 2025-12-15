import { supabase } from "@backend/lib/supabase";

export interface Subscription {
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
}

export interface CreateSubscriptionData {
  subscription_id_bytes32: string;
  creator_wallet_address: string;
  payer_wallet_address: string;
  receiver_wallet_address: string;
  amount: number;
  currency: "USDC" | "EURC";
  period_seconds: number;
  next_payment_due: string;
  description?: string;
}

export interface UpdateSubscriptionData {
  status?: "pending" | "active" | "cancelled_by_creator" | "cancelled_by_payer" | "paused";
  next_payment_due?: string;
  paused_at?: string;
  total_payments?: number;
  updated_at?: string;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  payer_wallet_address: string;
  amount: number;
  currency: "USDC" | "EURC";
  transaction_hash?: string;
  payment_date: string;
  renewal_fee: number;
  gas_cost?: number;
  created_at: string;
}

export interface SubscriptionCancellation {
  id: string;
  subscription_id: string;
  cancelled_by: "creator" | "payer";
  cancelled_by_wallet_address: string;
  cancellation_reason?: string;
  cancelled_at: string;
  notified_at?: string;
  notification_sent: boolean;
}

/**
 * Attempts to refresh the Supabase schema cache by querying the table
 */
async function tryRefreshSchemaCache(): Promise<void> {
  try {
    // Try a simple query to force schema cache update
    await supabase.from("subscriptions").select("id").limit(0);
  } catch (e) {
    // Ignore errors - this is just an attempt to refresh cache
  }
}

/**
 * Checks if the subscriptions table exists and is accessible
 */
async function checkTableExists(): Promise<{ exists: boolean; error?: string; errorType?: 'cache' | 'missing' | 'permission' | 'other' }> {
  try {
    const { error } = await supabase.from("subscriptions").select("id").limit(0);
    
    if (error) {
      const isSchemaCacheError = 
        error.message?.includes("schema cache") ||
        error.message?.includes("Could not find the table") ||
        error.code === "PGRST301" ||
        error.code === "PGRST116";
      
      const isTableMissing = 
        error.code === "42P01" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("relation") && error.message?.includes("does not exist");
      
      const isPermissionError = 
        error.code === "42501" ||
        error.message?.includes("permission denied") ||
        error.message?.includes("insufficient_privilege");
      
      if (isSchemaCacheError) {
        return {
          exists: false,
          errorType: 'cache',
          error: "Could not find the table 'public.subscriptions' in the schema cache. If you already restarted Supabase, the table may not exist. Please verify the table exists by running the migration script in Supabase SQL Editor."
        };
      }
      
      if (isTableMissing) {
        return {
          exists: false,
          errorType: 'missing',
          error: "Table 'public.subscriptions' does not exist. Please run the migration script (backend/supabase/supabase-migration-subscriptions.sql) in your Supabase SQL Editor."
        };
      }
      
      if (isPermissionError) {
        return {
          exists: false,
          errorType: 'permission',
          error: `Permission denied: ${error.message}. Please check Row Level Security (RLS) policies for the subscriptions table.`
        };
      }
      
      return { exists: false, errorType: 'other', error: error.message };
    }
    
    return { exists: true };
  } catch (e: any) {
    return { exists: false, errorType: 'other', error: e.message };
  }
}

export async function createSubscription(data: CreateSubscriptionData): Promise<{
  error: any;
  data: Subscription | null;
  isDuplicate: boolean;
}> {
  // First, check if table exists
  const tableCheck = await checkTableExists();
  if (!tableCheck.exists) {
    const errorMsg = tableCheck.error || "Could not find the table 'public.subscriptions'.";
    
    if (tableCheck.errorType === 'missing') {
      throw new Error(
        `Table 'public.subscriptions' does not exist. ` +
        `Your subscription was successfully registered on-chain. ` +
        `Please run the migration script (backend/supabase/supabase-migration-subscriptions.sql) in your Supabase SQL Editor.`
      );
    }
    
    if (tableCheck.errorType === 'cache') {
      throw new Error(
        `Could not find the table 'public.subscriptions' in the schema cache. ` +
        `Your subscription was successfully registered on-chain. ` +
        `If you already restarted Supabase, the table may not exist. ` +
        `Please verify by running: npm run migrate:subscriptions:check or check the Supabase SQL Editor.`
      );
    }
    
    if (tableCheck.errorType === 'permission') {
      throw new Error(
        `Permission denied accessing 'public.subscriptions'. ` +
        `Your subscription was successfully registered on-chain. ` +
        `Please check Row Level Security (RLS) policies. The table should allow INSERT for all users.`
      );
    }
    
    throw new Error(
      `Database error: ${errorMsg} ` +
      `Your subscription was successfully registered on-chain. ` +
      `Please check your Supabase configuration.`
    );
  }

  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { error, data: result } = await supabase.from("subscriptions").insert(data).select();

    if (error) {
      // Check if it's a schema cache error
      const isSchemaCacheError = 
        error.message?.includes("schema cache") ||
        error.message?.includes("Could not find the table") ||
        error.code === "PGRST301" ||
        error.code === "PGRST116";

      if (isSchemaCacheError && attempt < maxRetries - 1) {
        // Try to refresh cache and wait before retrying
        await tryRefreshSchemaCache();
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue; // Retry
      }

      if (error.message?.includes("column") && error.message?.includes("does not exist")) {
        throw new Error(
          `Database column missing: ${error.message}. Please run the database migration (backend/supabase/supabase-migration-subscriptions.sql).`
        );
      }
      if (error.code === "23505") {
        return { error: null, data: null, isDuplicate: true };
      }
      throw error;
    }

    return { error: null, data: result?.[0] || null, isDuplicate: false };
  }

  // If we get here, all retries failed
  throw new Error(
    "Failed to create subscription after multiple attempts. The table may not exist in the schema cache. " +
    "Your subscription was successfully registered on-chain. This is a temporary database issue. " +
    "You can retry saving to database. If you are the project owner, restart the Supabase project."
  );
}

export async function getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data;
}

export async function getSubscriptionByBytes32(
  subscriptionIdBytes32: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("subscription_id_bytes32", subscriptionIdBytes32)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data;
}

export async function getSubscriptionsByCreator(
  creatorAddress: string
): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("creator_wallet_address", creatorAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSubscriptionsByReceiver(
  receiverAddress: string
): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("receiver_wallet_address", receiverAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSubscriptionsByPayer(
  payerAddress: string
): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("payer_wallet_address", payerAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .order("next_payment_due", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateSubscription(
  subscriptionId: string,
  updates: UpdateSubscriptionData
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSubscriptionPayment(
  paymentData: Omit<SubscriptionPayment, "id" | "created_at">
): Promise<SubscriptionPayment> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .insert(paymentData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSubscriptionPayments(
  subscriptionId: string
): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("payment_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSubscriptionCancellation(
  cancellationData: Omit<SubscriptionCancellation, "id" | "cancelled_at" | "notification_sent">
): Promise<SubscriptionCancellation> {
  const { data, error } = await supabase
    .from("subscription_cancellations")
    .insert(cancellationData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSubscriptionCancellation(
  subscriptionId: string
): Promise<SubscriptionCancellation | null> {
  const { data, error } = await supabase
    .from("subscription_cancellations")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data;
}

export async function markCancellationAsNotified(cancellationId: string): Promise<void> {
  const { error } = await supabase
    .from("subscription_cancellations")
    .update({ notification_sent: true, notified_at: new Date().toISOString() })
    .eq("id", cancellationId);

  if (error) throw error;
}

const PAGE_SIZE = 10;

export async function getAllSubscriptionsByUserPaginated(
  userAddress: string,
  page: number = 0
): Promise<{ data: Subscription[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .or(
      `creator_wallet_address.eq.${userAddress.toLowerCase()},receiver_wallet_address.eq.${userAddress.toLowerCase()},payer_wallet_address.eq.${userAddress.toLowerCase()}`
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === PAGE_SIZE,
  };
}

export async function getActiveSubscriptionsByUserPaginated(
  userAddress: string,
  page: number = 0
): Promise<{ data: Subscription[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .or(
      `creator_wallet_address.eq.${userAddress.toLowerCase()},receiver_wallet_address.eq.${userAddress.toLowerCase()},payer_wallet_address.eq.${userAddress.toLowerCase()}`
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === PAGE_SIZE,
  };
}

export async function getSubscriptionsICreatedPaginated(
  userAddress: string,
  page: number = 0
): Promise<{ data: Subscription[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("creator_wallet_address", userAddress.toLowerCase())
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === PAGE_SIZE,
  };
}

export async function getSubscriptionsIPayPaginated(
  userAddress: string,
  page: number = 0
): Promise<{ data: Subscription[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("payer_wallet_address", userAddress.toLowerCase())
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === PAGE_SIZE,
  };
}

export async function getAllSubscriptionsByUser(userAddress: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .or(
      `creator_wallet_address.eq.${userAddress.toLowerCase()},receiver_wallet_address.eq.${userAddress.toLowerCase()},payer_wallet_address.eq.${userAddress.toLowerCase()}`
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveSubscriptionsByUser(userAddress: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .or(
      `creator_wallet_address.eq.${userAddress.toLowerCase()},receiver_wallet_address.eq.${userAddress.toLowerCase()},payer_wallet_address.eq.${userAddress.toLowerCase()}`
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSubscriptionsICreated(userAddress: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("creator_wallet_address", userAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSubscriptionsIPay(userAddress: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("payer_wallet_address", userAddress.toLowerCase())
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

