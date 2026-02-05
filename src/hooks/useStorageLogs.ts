import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
 import { deviceIdService } from "@/services/deviceIdService";
import type { StorageLog, StorageLogInsert } from "@/types/database";

export function useStorageLogs(limit = 100) {
   const deviceId = deviceIdService.getDeviceId();

  return useQuery({
     queryKey: ["storage-logs", deviceId, limit],
    queryFn: async () => {
       if (!deviceId) return [];

      const { data, error } = await supabase
        .from("storage_logs")
        .select("*")
         .eq("user_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching storage logs:", error);
        throw error;
      }

      return data as StorageLog[];
    },
     enabled: !!deviceId,
  });
}

export function useStorageLogsForChart(days = 7) {
   const deviceId = deviceIdService.getDeviceId();

  return useQuery({
     queryKey: ["storage-logs-chart", deviceId, days],
    queryFn: async () => {
       if (!deviceId) return [];

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("storage_logs")
        .select("*")
         .eq("user_id", deviceId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching storage logs for chart:", error);
        throw error;
      }

      return data as StorageLog[];
    },
     enabled: !!deviceId,
  });
}

export function useInsertStorageLog() {
  const queryClient = useQueryClient();
   const deviceId = deviceIdService.getDeviceId();

  return useMutation({
    mutationFn: async (log: Omit<StorageLogInsert, "user_id">) => {
       if (!deviceId) throw new Error("No device ID");

      const { data, error } = await supabase
        .from("storage_logs")
         .insert({ ...log, user_id: deviceId })
        .select()
        .single();

      if (error) {
        console.error("Error inserting storage log:", error);
        throw error;
      }

      return data as StorageLog;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["storage-logs", deviceId] });
       queryClient.invalidateQueries({ queryKey: ["storage-logs-chart", deviceId] });
    },
  });
}
