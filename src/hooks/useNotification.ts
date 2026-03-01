import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  action_url?: string;
  action_label?: string;
  priority: string;
  icon_type: string;
  created_at: string;
}

export const useActiveNotification = () => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveNotification();
    
    // Subscribe to real-time changes on notifications table
    const subscription = supabase
      .channel("active_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: "is_active=eq.true",
        },
        () => {
          fetchActiveNotification();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchActiveNotification = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows found, which is fine
        throw fetchError;
      }

      setNotification((data as any) as Notification | null);
      setError(null);
    } catch (err) {
      console.error("Error fetching active notification:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch notification");
      setNotification(null);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await (supabase as any)
        .from("notifications")
        .update({ is_active: false })
        .eq("id", notificationId);

      setNotification(null);
    } catch (err) {
      console.error("Error dismissing notification:", err);
    }
  };

  return {
    notification,
    loading,
    error,
    dismissNotification,
    refetch: fetchActiveNotification,
  };
};
