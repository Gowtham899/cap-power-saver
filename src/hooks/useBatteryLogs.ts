import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
 import { deviceIdService } from "@/services/deviceIdService";
import type { BatteryLog, BatteryLogInsert } from "@/types/database";

export function useBatteryLogs(limit = 100) {
   const deviceId = deviceIdService.getDeviceId();

  return useQuery({
     queryKey: ["battery-logs", deviceId, limit],
    queryFn: async () => {
       if (!deviceId) return [];

      const { data, error } = await supabase
        .from("battery_logs")
        .select("*")
         .eq("user_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching battery logs:", error);
        throw error;
      }

      return data as BatteryLog[];
    },
     enabled: !!deviceId,
  });
}

export function useBatteryLogsForChart(hours = 24) {
   const deviceId = deviceIdService.getDeviceId();

  return useQuery({
     queryKey: ["battery-logs-chart", deviceId, hours],
    queryFn: async () => {
       if (!deviceId) return [];

      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from("battery_logs")
        .select("*")
         .eq("user_id", deviceId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching battery logs for chart:", error);
        throw error;
      }

      return data as BatteryLog[];
    },
     enabled: !!deviceId,
  });
}

export function useInsertBatteryLog() {
  const queryClient = useQueryClient();
   const deviceId = deviceIdService.getDeviceId();

  return useMutation({
    mutationFn: async (log: Omit<BatteryLogInsert, "user_id">) => {
       if (!deviceId) throw new Error("No device ID");

      const { data, error } = await supabase
        .from("battery_logs")
         .insert({ ...log, user_id: deviceId })
        .select()
        .single();

      if (error) {
        console.error("Error inserting battery log:", error);
        throw error;
      }

      return data as BatteryLog;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["battery-logs", deviceId] });
       queryClient.invalidateQueries({ queryKey: ["battery-logs-chart", deviceId] });
    },
  });
}
