import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Star, Shield, Trash2, Ban, Crown } from "lucide-react";
import { toast } from "sonner";

const ranks = ["Platinum", "Diamond", "Heroic", "Master", "Grand Master"];
const rankColors: Record<string, string> = {
    Platinum: "text-cyan-300 bg-cyan-500/10", Diamond: "text-blue-400 bg-blue-500/10",
    Heroic: "text-red-400 bg-red-500/10", Master: "text-purple-400 bg-purple-500/10",
    "Grand Master": "text-orange-400 bg-orange-500/10",
};

const AdminUsers = ({ adminId }: { adminId: string }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("users")
            .select("id, nickname, uid, rank, role, is_vip, is_admin, is_banned, created_at")
            .order("created_at", { ascending: false });
        setUsers(data || []);
        setLoading(false);
    };

    const act = async (userId: string, update: Record<string, any>, msg: string) => {
        if (userId === adminId) { toast.error("Cannot modify your own account."); return; }
        setActing(userId);
        const { error } = await supabase.from("users").update(update).eq("id", userId);
        if (!error) { toast.success(msg); fetchUsers(); }
        else toast.error("Action failed.");
        setActing(null);
    };

    const deleteUser = async (userId: string) => {
        if (userId === adminId) { toast.error("Cannot delete admin account."); return; }
        if (!confirm("Delete this user permanently?")) return;
        await supabase.from("users").delete().eq("id", userId);
        toast.success("User deleted.");
        fetchUsers();
    };

    const filtered = users.filter((u) => {
        const q = search.toLowerCase();
        return !q || u.nickname.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q);
    });

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search nickname or UID..."
                        className="w-full bg-[#111] border border-[#1f1f1f] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                    />
                </div>
                <span className="text-xs text-gray-600">{filtered.length} users</span>
            </div>

            <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1a1a1a] text-[11px] text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3 text-left">Player</th>
                                <th className="px-4 py-3 text-left">Rank</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Change Rank</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141414]">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-4 py-4">
                                        <div className="h-4 bg-[#1a1a1a] rounded animate-pulse w-1/3" />
                                    </td></tr>
                                ))
                            ) : filtered.map((u) => (
                                <tr key={u.id} className="hover:bg-[#111] transition-colors">
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 font-bold text-xs flex-shrink-0">
                                                {u.nickname[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-xs flex items-center gap-1">
                                                    {u.nickname}
                                                    {u.is_admin && <Crown className="w-3 h-3 text-yellow-400" />}
                                                    {u.is_vip && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                                                </p>
                                                <p className="text-gray-600 text-[10px]">{u.uid}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rankColors[u.rank] || "text-gray-400 bg-gray-500/10"}`}>{u.rank}</span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.is_banned ? "text-red-400 bg-red-500/10" : "text-green-400 bg-green-500/10"}`}>
                                            {u.is_banned ? "Banned" : "Active"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <select
                                            value={u.rank}
                                            onChange={(e) => act(u.id, { rank: e.target.value }, `Rank updated to ${e.target.value}`)}
                                            disabled={acting === u.id}
                                            className="bg-[#1a1a1a] border border-[#262626] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-500/40"
                                        >
                                            {ranks.map((r) => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => act(u.id, { is_vip: !u.is_vip }, u.is_vip ? "VIP removed" : "Made VIP ⭐")}
                                                title={u.is_vip ? "Remove VIP" : "Make VIP"}
                                                className={`p-1.5 rounded-lg transition-colors ${u.is_vip ? "text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20" : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10"}`}>
                                                <Star className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => act(u.id, { is_banned: !u.is_banned }, u.is_banned ? "User unbanned" : "User banned 🚫")}
                                                title={u.is_banned ? "Unban" : "Ban"}
                                                className={`p-1.5 rounded-lg transition-colors ${u.is_banned ? "text-green-400 bg-green-500/10 hover:bg-green-500/20" : "text-gray-500 hover:text-red-400 hover:bg-red-500/10"}`}>
                                                <Ban className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => act(u.id, { is_admin: !u.is_admin }, u.is_admin ? "Admin removed" : "Made Admin 👑")}
                                                title={u.is_admin ? "Remove Admin" : "Make Admin"}
                                                className={`p-1.5 rounded-lg transition-colors ${u.is_admin ? "text-yellow-400 bg-yellow-500/10" : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10"}`}>
                                                <Crown className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => deleteUser(u.id)} title="Delete"
                                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
