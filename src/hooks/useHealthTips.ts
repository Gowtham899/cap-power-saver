import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HealthTip } from "@/types/database";

export function useHealthTips(category?: string) {
  return useQuery({
    queryKey: ["health-tips", category],
    queryFn: async () => {
      let query = supabase
        .from("health_tips")
        .select("*")
        .order("priority", { ascending: false });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching health tips:", error);
        throw error;
      }

      return data as HealthTip[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

export function useHealthTipsByCategory() {
  return useQuery({
    queryKey: ["health-tips-grouped"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_tips")
        .select("*")
        .order("priority", { ascending: false });

      if (error) {
        console.error("Error fetching health tips:", error);
        throw error;
      }

      const tips = data as HealthTip[];
      
      // Group by category
      const grouped = tips.reduce((acc, tip) => {
        if (!acc[tip.category]) {
          acc[tip.category] = [];
        }
        acc[tip.category].push(tip);
        return acc;
      }, {} as Record<string, HealthTip[]>);

      return grouped;
    },
    staleTime: 1000 * 60 * 30,
  });
}
