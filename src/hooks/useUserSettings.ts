import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserSettings, UserSettingsUpdate } from "@/types/database";

export function useUserSettings() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["user-settings", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error fetching user settings:", error);
        throw error;
      }

      return data as UserSettings | null;
    },
    enabled: !!userId,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (settings: UserSettingsUpdate) => {
      if (!userId) throw new Error("Not authenticated");

      // Upsert: insert if not exists, update if exists
      const { data, error } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: userId, ...settings },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("Error updating user settings:", error);
        throw error;
      }

      return data as UserSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings", userId] });
    },
  });
}
