// src/pages/kitchen/KitchenDashboard.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first kitchen display optimized for wall-mounted screens & tablets
// Fluid grid, large touch targets, high contrast for kitchen environment

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChefHat } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import { initSocket, joinRoom } from "@/lib/socket";
import { playSound } from "@/lib/utils";

import {
  KitchenOrderPopulated,
  KitchenOrdersResponse,
  KitchenStats,
} from "../../features/kitchen/types/types";

import KitchenOrderCard from "@/features/kitchen/components/KitchenOrderCard";
import StatsBar from "../../features/kitchen/components/StatsBar";

export default function KitchenDashboard() {
  const queryClient = useQueryClient();
  const [prevNewCount, setPrevNewCount] = useState(0);

  const { data, isLoading, isError } = useQuery<KitchenOrdersResponse>({
    queryKey: ["kitchen-orders"],
    queryFn: async () => {
      const res = await apiClient.get<KitchenOrdersResponse>("/kitchen/orders");
      return res;
    },
    refetchInterval: 12000,
    staleTime: 8000,
  });

  const startItemMutation = useMutation({
    mutationFn: async (vars: { kitchenOrderId: string; itemId: string }) => {
      await apiClient.post("/kitchen/start-item", vars);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] }),
  });

  const completeItemMutation = useMutation({
    mutationFn: async (vars: { kitchenOrderId: string; itemId: string }) => {
      await apiClient.post("/kitchen/complete-item", vars);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] }),
  });

  const completeOrderMutation = useMutation({
    mutationFn: async (kitchenOrderId: string) => {
      await apiClient.post("/kitchen/complete-order", { kitchenOrderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });

  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    joinRoom("kitchen");

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    };

    socket.on("itemStarted", handleUpdate);
    socket.on("itemCompleted", handleUpdate);
    socket.on("orderReadyForDelivery", () => {
      playSound("ready");
      handleUpdate();
    });
    socket.on("orderCompleted", handleUpdate);
    socket.on("kitchen-update", handleUpdate);

    return () => {
      socket.off("itemStarted", handleUpdate);
      socket.off("itemCompleted", handleUpdate);
      socket.off("orderReadyForDelivery");
      socket.off("orderCompleted");
      socket.off("kitchen-update");
    };
  }, [queryClient]);

  useEffect(() => {
    const currentNew = data?.stats.new ?? 0;
    if (currentNew > prevNewCount && prevNewCount > 0) {
      playSound("new");
    }
    setPrevNewCount(currentNew);
  }, [data?.stats.new]);

  const ordersToDisplay: KitchenOrderPopulated[] = [
    ...(data?.active ?? []),
    ...(data?.ready ?? [])
  ];

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-10 px-4">
        <ChefHat className="w-32 h-32 md:w-40 md:h-40 text-orange-500 animate-pulse" />
        <p className="text-3xl md:text-5xl font-bold text-gray-300 text-center">
          Loading Kitchen Dashboard...
        </p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-3xl md:text-5xl text-red-500 font-bold text-center">
          Failed to load kitchen data
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-amber-600 py-12 md:py-16 text-center shadow-2xl">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
            <ChefHat className="w-20 h-20 md:w-28 md:h-28 lg:w-36 lg:h-36" />
            KITCHEN DISPLAY
          </h1>
          <p className="text-2xl md:text-3xl lg:text-4xl mt-6 opacity-90 font-medium">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </header>

      {/* Stats Bar */}
      <StatsBar stats={data!.stats} />

      {/* Orders Grid */}
      <section className="container mx-auto px-4 py-12 lg:py-16">
        {ordersToDisplay.length === 0 ? (
          <div className="text-center py-20 lg:py-32">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-12 md:p-20 inline-block max-w-4xl mx-auto">
              <ChefHat className="w-32 h-32 md:w-48 md:h-48 mx-auto text-gray-600 mb-8" />
              <h2 className="text-5xl md:text-7xl font-black text-gray-400">
                All Caught Up!
              </h2>
              <p className="text-3xl md:text-5xl mt-6 text-gray-500">
                No active orders right now
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 lg:gap-12 max-w-screen-2xl mx-auto">
            {ordersToDisplay.map((order) => (
              <KitchenOrderCard
                key={order._id}
                order={order}
                onStartItem={(kitchenOrderId, itemId) =>
                  startItemMutation.mutate({ kitchenOrderId, itemId })
                }
                onCompleteItem={(kitchenOrderId, itemId) =>
                  completeItemMutation.mutate({ kitchenOrderId, itemId })
                }
                onCompleteOrder={(kitchenOrderId) =>
                  completeOrderMutation.mutate(kitchenOrderId)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-lg md:text-xl lg:text-2xl">
        Real-time updates • Last refreshed: {format(new Date(), "h:mm:ss a")}
      </footer>
    </main>
  );
}