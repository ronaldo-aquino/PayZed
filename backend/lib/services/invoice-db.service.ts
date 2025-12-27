import { supabase, type Invoice } from "@backend/lib/supabase";

export interface CreateInvoiceData {
  id: string;
  user_wallet_address: string;
  receiver_wallet_address: string;
  amount: number;
  currency: "USDC" | "EURC";
  status: "pending" | "paid" | "expired";
  payment_link: string;
  description?: string;
  fee_amount?: number;
  transaction_hash?: string;
  gas_cost?: number;
  gas_cost_creation?: number;
}

export interface UpdateInvoiceData {
  status?: "pending" | "paid" | "expired";
  transaction_hash?: string;
  paid_at?: string;
  payer_address?: string;
  gas_cost?: number;
  gas_cost_payment?: number;
  updated_at?: string;
}

export async function createInvoice(data: CreateInvoiceData): Promise<{
  error: any;
  data: Invoice | null;
  isDuplicate: boolean;
}> {
  const { error, data: result } = await supabase.from("invoices").insert(data).select();

  if (error) {
    if (error.message?.includes("column") && error.message?.includes("does not exist")) {
      throw new Error(
        `Database column missing: ${error.message}. Please run the database migration.`
      );
    }
    if (error.code === "23505") {
      return { error: null, data: null, isDuplicate: true };
    }
    throw error;
  }

  return { error: null, data: result?.[0] || null, isDuplicate: false };
}

export async function getInvoiceById(invoiceId: string) {
  // Force fresh data by adding a timestamp to bypass cache
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllInvoicesByUser(userAddress: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_wallet_address", userAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPaidInvoicesByUser(userAddress: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_wallet_address", userAddress.toLowerCase())
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPendingInvoicesByUser(userAddress: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_wallet_address", userAddress.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getInvoicesPaidByUser(userAddress: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("payer_address", userAddress.toLowerCase())
    .eq("status", "paid")
    .not("payer_address", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

const PAGE_SIZE = 10;

export async function getAllInvoicesByUserPaginated(
  userAddress: string,
  page: number = 0
): Promise<{ data: Invoice[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_wallet_address", userAddress.toLowerCase())
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === PAGE_SIZE,
  };
}

export async function getPaidInvoicesByUserPaginated(
  userAddress: string,
  page: number = 0
): Promise<{ data: Invoice[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_wallet_address", userAddress.toLowerCase())
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === PAGE_SIZE,
  };
}

export async function getPendingInvoicesByUserPaginated(
  userAddress: string,
  page: number = 0
): Promise<{ data: Invoice[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_wallet_address", userAddress.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === PAGE_SIZE,
  };
}

export async function getInvoicesPaidByUserPaginated(
  userAddress: string,
  page: number = 0
): Promise<{ data: Invoice[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("payer_address", userAddress.toLowerCase())
    .eq("status", "paid")
    .not("payer_address", "is", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === PAGE_SIZE,
  };
}

export async function updateInvoice(
  invoiceId: string,
  updates: UpdateInvoiceData
): Promise<Invoice | null> {
  const { error, data } = await supabase
    .from("invoices")
    .update({
      ...updates,
      updated_at: updates.updated_at || new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInvoicePayment(
  invoiceId: string,
  transactionHash: string,
  payerAddress: string,
  gasCost?: number
): Promise<Invoice | null> {
  if (!payerAddress || payerAddress.trim() === "") {
    throw new Error("payerAddress is required");
  }

  const payerAddressLower = payerAddress.toLowerCase().trim();
  
  const updates: UpdateInvoiceData = {
    status: "paid",
    transaction_hash: transactionHash,
    paid_at: new Date().toISOString(),
    payer_address: payerAddressLower,
    gas_cost_payment: gasCost,
    updated_at: new Date().toISOString(),
  };

  const { error, data } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", invoiceId)
    .select();

  if (error) {
    throw error;
  }

  if (data && data.length > 0) {
    const updatedInvoice = data[0];
    if (!updatedInvoice.payer_address || updatedInvoice.payer_address !== payerAddressLower) {
      const { error: updateError, data: retryData } = await supabase
        .from("invoices")
        .update({
          payer_address: payerAddressLower,
        })
        .eq("id", invoiceId)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      return retryData || { ...updatedInvoice, payer_address: payerAddressLower };
    }
    return updatedInvoice;
  }
  
  return null;

  return null;
}

export async function updateInvoicePayerAddress(invoiceId: string, payerAddress: string) {
  const { error } = await supabase
    .from("invoices")
    .update({
      payer_address: payerAddress.toLowerCase(),
    })
    .eq("id", invoiceId);

  if (error) throw error;
}
