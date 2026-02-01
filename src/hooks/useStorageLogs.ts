import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { StorageLog, StorageLogInsert } from "@/types/database";

export function useStorageLogs(limit = 100) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["storage-logs", userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("storage_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching storage logs:", error);
        throw error;
      }

      return data as StorageLog[];
    },
    enabled: !!userId,
  });
}

export function useStorageLogsForChart(days = 7) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["storage-logs-chart", userId, days],
    queryFn: async () => {
      if (!userId) return [];

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("storage_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching storage logs for chart:", error);
        throw error;
      }

      return data as StorageLog[];
    },
    enabled: !!userId,
  });
}

export function useInsertStorageLog() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (log: Omit<StorageLogInsert, "user_id">) => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("storage_logs")
        .insert({ ...log, user_id: userId })
        .select()
        .single();

      if (error) {
        console.error("Error inserting storage log:", error);
        throw error;
      }

      return data as StorageLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-logs", userId] });
      queryClient.invalidateQueries({ queryKey: ["storage-logs-chart", userId] });
    },
  });
}
