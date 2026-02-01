import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { BatteryLog, BatteryLogInsert } from "@/types/database";

export function useBatteryLogs(limit = 100) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["battery-logs", userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("battery_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching battery logs:", error);
        throw error;
      }

      return data as BatteryLog[];
    },
    enabled: !!userId,
  });
}

export function useBatteryLogsForChart(hours = 24) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["battery-logs-chart", userId, hours],
    queryFn: async () => {
      if (!userId) return [];

      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from("battery_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching battery logs for chart:", error);
        throw error;
      }

      return data as BatteryLog[];
    },
    enabled: !!userId,
  });
}

export function useInsertBatteryLog() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (log: Omit<BatteryLogInsert, "user_id">) => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("battery_logs")
        .insert({ ...log, user_id: userId })
        .select()
        .single();

      if (error) {
        console.error("Error inserting battery log:", error);
        throw error;
      }

      return data as BatteryLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["battery-logs", userId] });
      queryClient.invalidateQueries({ queryKey: ["battery-logs-chart", userId] });
    },
  });
}
