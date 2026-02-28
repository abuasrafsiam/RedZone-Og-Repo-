import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    LayoutDashboard, Users, MessageSquare, Megaphone, Bell, Tv, Settings, LogOut, Menu, X, Shield,
} from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
import AdminChats from "./AdminChats";
import AdminAnnouncements from "./AdminAnnouncements";
import AdminNotifications from "./AdminNotifications";
import AdminAds from "./AdminAds";
import AdminSettings from "./AdminSettings";

const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "chats", label: "Chats", icon: MessageSquare },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "ads", label: "Ads", icon: Tv },
    { id: "settings", label: "Settings", icon: Settings },
];

interface AdminLayoutProps {
    adminId: string;
    onLogout: () => void;
}

const AdminLayout = ({ adminId, onLogout }: AdminLayoutProps) => {
    const [page, setPage] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const renderPage = () => {
        switch (page) {
            case "dashboard": return <AdminDashboard />;
            case "users": return <AdminUsers adminId={adminId} />;
            case "chats": return <AdminChats />;
            case "announcements": return <AdminAnnouncements />;
            case "notifications": return <AdminNotifications />;
            case "ads": return <AdminAds />;
            case "settings": return <AdminSettings />;
            default: return <AdminDashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-[#070707] text-white overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? "w-56" : "w-16"} flex-shrink-0 flex flex-col border-r border-[#1a1a1a] transition-all duration-300`}
                style={{ background: "#0d0d0d" }}
            >
                {/* Brand */}
                <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1a1a1a]">
                    <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-red-500" />
                    </div>
                    {sidebarOpen && <span className="font-black text-sm tracking-tight">RedZone <span className="text-red-500">Admin</span></span>}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-3 space-y-0.5 px-2">
                    {nav.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setPage(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${page === id
                                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                }`}
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {sidebarOpen && <span>{label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-2 border-t border-[#1a1a1a]">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1a1a1a] bg-[#0a0a0a] flex-shrink-0">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                    >
                        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                    <h2 className="font-bold text-sm text-white capitalize">{page}</h2>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/25 px-2.5 py-1 rounded-full font-bold">ADMIN</span>
                    </div>
                </header>

                {/* Page content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
