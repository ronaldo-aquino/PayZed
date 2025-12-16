import { useState, useEffect, useCallback, useRef } from "react";
import type { Invoice } from "@backend/lib/supabase";
import { getInvoiceById } from "@backend/lib/services/invoice-db.service";

export function useInvoice(invoiceId: string | undefined) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;

    try {
      const data = await getInvoiceById(invoiceId);
      
      // Only update if status actually changed to avoid unnecessary re-renders
      if (data?.status !== lastStatusRef.current) {
        console.log(`[useInvoice] Status mudou: ${lastStatusRef.current} -> ${data?.status}`);
        lastStatusRef.current = data?.status || null;
        setInvoice(data);
      }
    } catch (error) {
      console.error(`[useInvoice] Erro ao buscar invoice:`, error);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  // Initial fetch
  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, fetchInvoice]);

  // Polling effect - only when status is pending
  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only start polling if invoice is pending
    if (invoice && invoice.status === "pending") {
      console.log(`[useInvoice] Iniciando polling para invoice pendente...`);
      pollingIntervalRef.current = setInterval(() => {
        fetchInvoice();
      }, 2000);
    } else if (invoice && invoice.status === "paid") {
      console.log(`[useInvoice] Invoice está pago, polling não será iniciado.`);
    }

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        console.log(`[useInvoice] Parando polling...`);
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [invoice?.status, fetchInvoice]); // Only depend on status, not the whole invoice object

  return {
    invoice,
    loading,
    refetch: fetchInvoice,
  };
}
