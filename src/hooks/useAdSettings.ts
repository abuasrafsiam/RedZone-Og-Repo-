import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch and manage global app settings
 * Returns the ads_enabled boolean value and a function to update it
 */
export const useAdSettings = () => {
  const [adsEnabled, setAdsEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the initial value
  useEffect(() => {
    fetchAdsEnabled();
  }, []);

  const fetchAdsEnabled = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ads_enabled")
        .single();

      if (fetchError) {
        console.error("Error fetching ads_enabled:", fetchError);
        setError(fetchError.message);
        setAdsEnabled(true); // Default to true if fetch fails
        return;
      }

      // Extract boolean value from JSONB
      const value = data?.value;
      let isEnabled = true;
      
      if (typeof value === "boolean") {
        isEnabled = value;
      } else if (typeof value === "string") {
        isEnabled = value.toLowerCase() === "true";
      } else if (typeof value === "object" && value !== null) {
        // Handle case where JSONB is stored as object
        isEnabled = Boolean(value);
      }
      
      setAdsEnabled(isEnabled);
      setError(null);
    } catch (err) {
      console.error("Error in fetchAdsEnabled:", err);
      setError(String(err));
      setAdsEnabled(true); // Default to true on error
    } finally {
      setLoading(false);
    }
  };

  const updateAdsEnabled = async (enabled: boolean) => {
    try {
      // Store as string in the database for consistency with other settings
      const { error: updateError } = await supabase
        .from("app_settings")
        .upsert({ key: "ads_enabled", value: String(enabled) }, { onConflict: "key" });

      if (updateError) {
        console.error("Error updating ads_enabled:", updateError);
        setError(updateError.message);
        return false;
      }

      setAdsEnabled(enabled);
      setError(null);
      return true;
    } catch (err) {
      console.error("Error in updateAdsEnabled:", err);
      setError(String(err));
      return false;
    }
  };

  return { adsEnabled, loading, error, updateAdsEnabled, refetch: fetchAdsEnabled };
};
