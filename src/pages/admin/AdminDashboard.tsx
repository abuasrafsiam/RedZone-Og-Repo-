import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, MessageCircle, TrendingUp, Activity } from "lucide-react";

interface Stat { label: string; value: number; icon: React.ReactNode; color: string; }

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, online: 0, chats: 0, messages: 0 });
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        const [usersRes, chatsRes, messagesRes, recentRes] = await Promise.all([
            supabase.from("users").select("id, created_at", { count: "exact" }),
            supabase.from("chats").select("id", { count: "exact" }),
            supabase.from("messages").select("id", { count: "exact" }),
            supabase.from("users").select("id, nickname, rank, created_at").order("created_at", { ascending: false }).limit(5),
        ]);

        const now = Date.now();
        const onlineCount = (usersRes.data || []).filter(
            (u: any) => now - new Date(u.created_at).getTime() < 24 * 60 * 60 * 1000
        ).length;

        setStats({
            users: usersRes.count || 0,
            online: onlineCount,
            chats: chatsRes.count || 0,
            messages: messagesRes.count || 0,
        });
        setRecentUsers(recentRes.data || []);
        setLoading(false);
    };

    const cards: Stat[] = [
        { label: "Total Users", value: stats.users, icon: <Users className="w-5 h-5" />, color: "#ef4444" },
        { label: "Online (24h)", value: stats.online, icon: <Activity className="w-5 h-5" />, color: "#22c55e" },
        { label: "Total Chats", value: stats.chats, icon: <MessageCircle className="w-5 h-5" />, color: "#3b82f6" },
        { label: "Total Messages", value: stats.messages, icon: <MessageSquare className="w-5 h-5" />, color: "#a855f7" },
    ];

    const rankColors: Record<string, string> = {
        Platinum: "text-cyan-300", Diamond: "text-blue-400", Heroic: "text-red-400",
        Master: "text-purple-400", "Grand Master": "text-orange-400",
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-white mb-1">Dashboard</h2>
                <p className="text-sm text-gray-500">Live overview of RedZone.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((c) => (
                    <div key={c.label} className="rounded-2xl p-4 border border-[#1a1a1a] bg-[#0d0d0d] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${c.color}18`, color: c.color, border: `1px solid ${c.color}30` }}>
                            {c.icon}
                        </div>
                        <div>
                            <p className="text-xl font-black text-white leading-none">{loading ? "—" : c.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Users */}
            <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold text-white">Recent Signups</h3>
                </div>
                <div className="divide-y divide-[#141414]">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] animate-pulse" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 bg-[#1a1a1a] rounded animate-pulse w-1/4" />
                                    <div className="h-2.5 bg-[#1a1a1a] rounded animate-pulse w-1/6" />
                                </div>
                            </div>
                        ))
                    ) : recentUsers.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#111] transition-colors">
                            <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 font-bold text-xs flex-shrink-0">
                                {u.nickname[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium truncate">{u.nickname}</p>
                                <p className={`text-[11px] font-semibold ${rankColors[u.rank] || "text-gray-500"}`}>{u.rank}</p>
                            </div>
                            <span className="text-[10px] text-gray-600">
                                {new Date(u.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
