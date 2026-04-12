import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { deviceIdService } from "@/services/deviceIdService";
import type { UserSettings, UserSettingsUpdate } from "@/types/database";

export function useUserSettings() {
  const deviceId = deviceIdService.getDeviceId();

  return useQuery({
    queryKey: ["user-settings", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", deviceId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user settings:", error);
        throw error;
      }

      return data as UserSettings | null;
    },
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const deviceId = deviceIdService.getDeviceId();

  return useMutation({
    mutationFn: async (settings: UserSettingsUpdate) => {
      const { data, error } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: deviceId, ...settings },
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
      queryClient.invalidateQueries({ queryKey: ["user-settings", deviceId] });
    },
  });
}
