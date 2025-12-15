import { useState, useEffect } from "react";
import type { Subscription } from "@backend/lib/supabase";
import { getSubscriptionById } from "@backend/lib/services/subscription-db.service";

export function useSubscription(subscriptionId: string | undefined) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!subscriptionId) return;

    try {
      const data = await getSubscriptionById(subscriptionId);
      setSubscription(data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subscriptionId) {
      fetchSubscription();
    }
  }, [subscriptionId]);

  useEffect(() => {
    if (subscription && (subscription.status === "active" || subscription.status === "pending")) {
      const interval = setInterval(fetchSubscription, 5000);
      return () => clearInterval(interval);
    }
  }, [subscription]);

  return {
    subscription,
    loading,
    refetch: fetchSubscription,
  };
}


