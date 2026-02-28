import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTheme } from "@/hooks/useTheme";
import { useActiveNotification } from "@/hooks/useNotification";
import { useAppVersion } from "@/hooks/useAppVersion";
import BottomNav from "@/components/BottomNav";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import NotificationModal from "@/components/NotificationModal";
import UpdateModal from "@/components/UpdateModal";
import Index from "./pages/Index";
import Players from "./pages/Players";
import Squads from "./pages/Squads";
import Chat from "./pages/Chat";
import SquadChat from "./pages/SquadChat";
import Profile from "./pages/Profile";
import CreateProfile from "./pages/CreateProfile";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AdminPage from "./pages/admin/AdminPage";

const queryClient = new QueryClient();

const AppContent = () => {
  const { userId, saveUserId, clearUser } = useCurrentUser();
  const { mounted } = useTheme();
  const location = useLocation();
  const { notification, dismissNotification } = useActiveNotification();
  const { latestVersion, needsUpdate, forceUpdate } = useAppVersion();
  
  const [showNotification, setShowNotification] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  
  // Track notification state by ID + timestamp to detect changes
  const notificationStateRef = useRef<{ id: string; timestamp: string } | null>(null);
  
  // Show notification when available or when notification data changes
  useEffect(() => {
    if (notification && notification.is_active) {
      // Create current state key from notification ID + timestamp
      const currentStateKey = { 
        id: notification.id, 
        timestamp: notification.created_at 
      };
      
      // Check if this is a different notification than what we're already showing
      const hasSameState = 
        notificationStateRef.current &&
        notificationStateRef.current.id === currentStateKey.id &&
        notificationStateRef.current.timestamp === currentStateKey.timestamp;
      
      // If it's not the same notification, show it (force re-render)
      if (!hasSameState) {
        notificationStateRef.current = currentStateKey;
        setShowNotification(true);
        console.log("Notification modal opened for:", notification.id);
      }
    } else {
      // No active notification
      notificationStateRef.current = null;
      setShowNotification(false);
    }
  }, [notification?.id, notification?.created_at, notification?.is_active]);

  // Show update when needed and app loads
  useEffect(() => {
    if (needsUpdate && latestVersion) {
      setShowUpdate(true);
    }
  }, [needsUpdate, latestVersion?.id]);

  // Theme is already initialized by useTheme hook before this renders

  if (!mounted) {
    return null;
  }

  // Admin panel — always accessible, no user auth needed
  if (location.pathname.startsWith("/admin")) {
    return <AdminPage />;
  }

  // Reset password — accessible without login
  if (location.pathname === "/reset-password") {
    return <ResetPassword />;
  }

  if (!userId) {
    return <CreateProfile onCreated={saveUserId} />;
  }

  return (
    <>
      <AnnouncementPopup />
      {/* Notification Modal */}
      <NotificationModal
        notification={notification}
        onDismiss={(id) => {
          // Reset state to allow future notifications
          notificationStateRef.current = null;
          setShowNotification(false);
          // Dismiss in hook (updates cache and DB)
          dismissNotification(id);
        }}
        isOpen={showNotification}
      />

      {/* Update Modal */}
      <UpdateModal
        version={latestVersion}
        isOpen={showUpdate}
        onDismiss={() => {
          if (!forceUpdate) {
            setShowUpdate(false);
          }
        }}
        forceUpdate={forceUpdate}
      />

      {/* Block app content if force update is required */}
      {forceUpdate ? (
        <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Update Required
            </h1>
            <p className="text-muted-foreground mb-6">
              A critical app update is required. Please update to continue.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Routes>
            <Route path="/" element={<Index currentUserId={userId} />} />
            <Route path="/players" element={<Players currentUserId={userId} />} />
            <Route path="/squads" element={<Squads currentUserId={userId!} />} />
            <Route path="/chat" element={<Chat currentUserId={userId} />} />
            <Route path="/squad/chat/:squadId" element={<SquadChat currentUserId={userId} />} />
            <Route path="/profile" element={<Profile currentUserId={userId} onLogout={clearUser} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </>
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
