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
      
      if (data?.status !== lastStatusRef.current) {
        lastStatusRef.current = data?.status || null;
        setInvoice(data);
      }
    } catch (error) {
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

    if (invoice && invoice.status === "pending") {
      pollingIntervalRef.current = setInterval(() => {
        fetchInvoice();
      }, 2000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [invoice?.status, fetchInvoice]);

  return {
    invoice,
    loading,
    refetch: fetchInvoice,
  };
}
