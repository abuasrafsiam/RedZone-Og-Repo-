import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppVersion {
  id: string;
  version_code: number;
  version_name: string;
  update_message: string;
  download_url: string;
  force_update: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Current app version (update this when releasing new versions)
const CURRENT_APP_VERSION = 1;

export const useAppVersion = () => {
  const [latestVersion, setLatestVersion] = useState<AppVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    fetchLatestVersion();

    // Subscribe to real-time changes on app_versions table
    const subscription = supabase
      .channel("app_versions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_versions",
        },
        () => {
          fetchLatestVersion();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchLatestVersion = async () => {
    try {
      setLoading(true);
      // Get the highest version_code that is active
      const { data, error: fetchError } = await (supabase as any)
        .from("app_versions")
        .select("*")
        .eq("is_active", true)
        .order("version_code", { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (data) {
        const appVersion = (data as any) as AppVersion;
        setLatestVersion(appVersion);

        // Check if update is needed
        const updateNeeded = appVersion.version_code > CURRENT_APP_VERSION;
        setNeedsUpdate(updateNeeded);
        setForceUpdate(updateNeeded && appVersion.force_update);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching app version:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch app version");
    } finally {
      setLoading(false);
    }
  };

  return {
    latestVersion,
    loading,
    error,
    needsUpdate,
    forceUpdate,
    currentVersion: CURRENT_APP_VERSION,
    refetch: fetchLatestVersion,
  };
};
