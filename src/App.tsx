import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTheme } from "@/hooks/useTheme";
import BottomNav from "@/components/BottomNav";
import AnnouncementPopup from "@/components/AnnouncementPopup";
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
