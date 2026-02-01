import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UsageLog, UsageLogInsert } from "@/types/database";

export function useUsageLogs(limit = 100) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["usage-logs", userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching usage logs:", error);
        throw error;
      }

      return data as UsageLog[];
    },
    enabled: !!userId,
  });
}

export function useUsageLogsForChart(days = 30) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["usage-logs-chart", userId, days],
    queryFn: async () => {
      if (!userId) return [];

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching usage logs for chart:", error);
        throw error;
      }

      return data as UsageLog[];
    },
    enabled: !!userId,
  });
}

export function useInsertUsageLog() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (log: Omit<UsageLogInsert, "user_id">) => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("usage_logs")
        .insert({ ...log, user_id: userId })
        .select()
        .single();

      if (error) {
        console.error("Error inserting usage log:", error);
        throw error;
      }

      return data as UsageLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usage-logs", userId] });
      queryClient.invalidateQueries({ queryKey: ["usage-logs-chart", userId] });
    },
  });
}

export function useLatestUsageLog() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["usage-log-latest", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching latest usage log:", error);
        throw error;
      }

      return data as UsageLog | null;
    },
    enabled: !!userId,
  });
}
