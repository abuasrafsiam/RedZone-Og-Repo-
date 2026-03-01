import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTheme } from "@/hooks/useTheme";
import { useActiveNotification } from "@/hooks/useNotification";
import { useAppVersion } from "@/hooks/useAppVersion";
import { ChatProvider, useChatContext } from "@/context/ChatContext";
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
  const { isInConversation } = useChatContext();
  
  const [showNotification, setShowNotification] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  // Show notification when available
  useEffect(() => {
    if (notification && notification.is_active) {
      setShowNotification(true);
    }
  }, [notification?.id]);

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
          dismissNotification(id);
          setShowNotification(false);
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
            <Route path="/chat/:conversationId" element={<Chat currentUserId={userId} />} />
            <Route path="/squad/chat/:squadId" element={<SquadChat currentUserId={userId} />} />
            <Route path="/profile" element={<Profile currentUserId={userId} onLogout={clearUser} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          {/* Show BottomNav on all pages except messenger conversations */}
          {!location.pathname.startsWith("/chat/") && !location.pathname.startsWith("/squad/chat/") && <BottomNav />}
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
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
