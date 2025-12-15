import { useState, useEffect, useCallback } from "react";
import type { Subscription } from "@backend/lib/supabase";
import {
  getAllSubscriptionsByUserPaginated,
  getActiveSubscriptionsByUserPaginated,
  getSubscriptionsICreatedPaginated,
  getSubscriptionsIPayPaginated,
  getAllSubscriptionsByUser,
  getActiveSubscriptionsByUser,
  getSubscriptionsICreated,
  getSubscriptionsIPay,
} from "@backend/lib/services/subscription-db.service";

type TabType = "all" | "active" | "created" | "paying";

export function useSubscriptionList(address: string | undefined) {
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionsICreated, setSubscriptionsICreated] = useState<Subscription[]>([]);
  const [subscriptionsIPay, setSubscriptionsIPay] = useState<Subscription[]>([]);
  const [totalCounts, setTotalCounts] = useState({
    all: 0,
    active: 0,
    created: 0,
    paying: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState({
    all: true,
    active: true,
    created: true,
    paying: true,
  });
  const [currentPage, setCurrentPage] = useState({
    all: 0,
    active: 0,
    created: 0,
    paying: 0,
  });

  const fetchInitialData = async () => {
    if (!address) return;

    try {
      setLoading(true);

      const [allData, activeData, createdData, payingData] = await Promise.all([
        getAllSubscriptionsByUser(address),
        getActiveSubscriptionsByUser(address),
        getSubscriptionsICreated(address),
        getSubscriptionsIPay(address),
      ]);

      setTotalCounts({
        all: allData.length,
        active: activeData.length,
        created: createdData.length,
        paying: payingData.length,
      });

      const [allPaginated, activePaginated, createdPaginated, payingPaginated] = await Promise.all([
        getAllSubscriptionsByUserPaginated(address, 0),
        getActiveSubscriptionsByUserPaginated(address, 0),
        getSubscriptionsICreatedPaginated(address, 0),
        getSubscriptionsIPayPaginated(address, 0),
      ]);

      setAllSubscriptions(allPaginated.data);
      setActiveSubscriptions(activePaginated.data);
      setSubscriptionsICreated(createdPaginated.data);
      setSubscriptionsIPay(payingPaginated.data);

      setHasMore({
        all: allPaginated.hasMore,
        active: activePaginated.hasMore,
        created: createdPaginated.hasMore,
        paying: payingPaginated.hasMore,
      });
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(
    async (tab: TabType) => {
      if (!address || loadingMore || !hasMore[tab]) return;

      try {
        setLoadingMore(true);
        const nextPage = currentPage[tab] + 1;

        let result: { data: Subscription[]; hasMore: boolean };
        switch (tab) {
          case "all":
            result = await getAllSubscriptionsByUserPaginated(address, nextPage);
            setAllSubscriptions((prev) => [...prev, ...result.data]);
            break;
          case "active":
            result = await getActiveSubscriptionsByUserPaginated(address, nextPage);
            setActiveSubscriptions((prev) => [...prev, ...result.data]);
            break;
          case "created":
            result = await getSubscriptionsICreatedPaginated(address, nextPage);
            setSubscriptionsICreated((prev) => [...prev, ...result.data]);
            break;
          case "paying":
            result = await getSubscriptionsIPayPaginated(address, nextPage);
            setSubscriptionsIPay((prev) => [...prev, ...result.data]);
            break;
        }

        setHasMore((prev) => ({ ...prev, [tab]: result.hasMore }));
        setCurrentPage((prev) => ({ ...prev, [tab]: nextPage }));
      } catch (error) {
        console.error("Error loading more subscriptions:", error);
      } finally {
        setLoadingMore(false);
      }
    },
    [address, loadingMore, hasMore, currentPage]
  );

  const refetch = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setCurrentPage({ all: 0, active: 0, created: 0, paying: 0 });

      const [allPaginated, activePaginated, createdPaginated, payingPaginated] = await Promise.all([
        getAllSubscriptionsByUserPaginated(address, 0),
        getActiveSubscriptionsByUserPaginated(address, 0),
        getSubscriptionsICreatedPaginated(address, 0),
        getSubscriptionsIPayPaginated(address, 0),
      ]);

      setAllSubscriptions(allPaginated.data);
      setActiveSubscriptions(activePaginated.data);
      setSubscriptionsICreated(createdPaginated.data);
      setSubscriptionsIPay(payingPaginated.data);

      setHasMore({
        all: allPaginated.hasMore,
        active: activePaginated.hasMore,
        created: createdPaginated.hasMore,
        paying: payingPaginated.hasMore,
      });
    } catch (error) {
      console.error("Error refetching subscriptions:", error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchInitialData();
    }
  }, [address]);

  return {
    allSubscriptions,
    activeSubscriptions,
    subscriptionsICreated,
    subscriptionsIPay,
    totalCounts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refetch,
  };
}


