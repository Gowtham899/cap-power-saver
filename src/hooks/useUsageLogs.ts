import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { deviceIdService } from "@/services/deviceIdService";
import type { UsageLog, UsageLogInsert } from "@/types/database";

export function useUsageLogs(limit = 100) {
  const deviceId = deviceIdService.getDeviceId();

  return useQuery({
    queryKey: ["usage-logs", deviceId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching usage logs:", error);
        throw error;
      }

      return data as UsageLog[];
    },
  });
}

export function useUsageLogsForChart(days = 30) {
  const deviceId = deviceIdService.getDeviceId();

  return useQuery({
    queryKey: ["usage-logs-chart", deviceId, days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", deviceId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching usage logs for chart:", error);
        throw error;
      }

      return data as UsageLog[];
    },
  });
}

export function useInsertUsageLog() {
  const queryClient = useQueryClient();
  const deviceId = deviceIdService.getDeviceId();

  return useMutation({
    mutationFn: async (log: Omit<UsageLogInsert, "user_id">) => {
      const { data, error } = await supabase
        .from("usage_logs")
        .insert({ ...log, user_id: deviceId })
        .select()
        .single();

      if (error) {
        console.error("Error inserting usage log:", error);
        throw error;
      }

      return data as UsageLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usage-logs", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["usage-logs-chart", deviceId] });
    },
  });
}

export function useLatestUsageLog() {
  const deviceId = deviceIdService.getDeviceId();

  return useQuery({
    queryKey: ["usage-log-latest", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching latest usage log:", error);
        throw error;
      }

      return data as UsageLog | null;
    },
  });
}
