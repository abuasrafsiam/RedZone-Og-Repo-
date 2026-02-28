import { useState, useEffect, useRef } from "react";
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
  
  // Track notification by ID + timestamp to detect content changes
  const notificationCacheRef = useRef<{ id: string; timestamp: string } | null>(null);
  
  // Track if a notification was just dismissed to prevent immediate re-showing
  const dismissedRef = useRef<Set<string>>(new Set());

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
        (payload) => {
          // Force refetch on any change to ensure we get latest data
          console.log("Notification change detected:", payload.eventType);
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

      if (data) {
        const fetchedNotification = data as Notification;
        
        // Create cache key combining ID + timestamp (detects content updates)
        const cacheKey = { 
          id: fetchedNotification.id, 
          timestamp: fetchedNotification.created_at 
        };
        
        // Check if this is a genuinely new or updated notification
        const isDifferent = 
          !notificationCacheRef.current ||
          notificationCacheRef.current.id !== cacheKey.id ||
          notificationCacheRef.current.timestamp !== cacheKey.timestamp;

        // Only update if notification is different AND not recently dismissed
        if (isDifferent && !dismissedRef.current.has(fetchedNotification.id)) {
          notificationCacheRef.current = cacheKey;
          setNotification(fetchedNotification);
          console.log("Notification updated:", fetchedNotification.id);
        }
      } else {
        // No active notification
        setNotification(null);
        notificationCacheRef.current = null;
      }
      
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
      // Mark as dismissed for this session
      dismissedRef.current.add(notificationId);
      
      // Clear state immediately
      setNotification(null);
      notificationCacheRef.current = null;
      
      // Update database
      await (supabase as any)
        .from("notifications")
        .update({ is_active: false })
        .eq("id", notificationId);

      console.log("Notification dismissed:", notificationId);
    } catch (err) {
      console.error("Error dismissing notification:", err);
      // Still clear local state even if DB update fails
      setNotification(null);
      notificationCacheRef.current = null;
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
