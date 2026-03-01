import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Globe, User, Trophy, AlertCircle, Check, Info, AlertTriangle, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ranks = ["Platinum", "Diamond", "Heroic", "Master", "Grand Master"];
const priorities = ["low", "normal", "high", "urgent"];
const iconTypes = ["info", "success", "warning", "error"];

const AdminNotifications = () => {
    const [mode, setMode] = useState<"global" | "user" | "rank">("global");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [userIdentifier, setUserIdentifier] = useState("");
    const [rankTarget, setRankTarget] = useState("Heroic");
    const [priority, setPriority] = useState("normal");
    const [iconType, setIconType] = useState("info");
    const [actionUrl, setActionUrl] = useState("");
    const [actionLabel, setActionLabel] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [sending, setSending] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Track if this is the initial load
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        // Initial fetch
        fetchNotifications(true);
        
        const subscription = supabase
            .channel("notifications-channel")
            .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
                // Don't show loading state on subsequent updates
                fetchNotifications(false);
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchNotifications = async (isInitial: boolean = false) => {
        // Only show loading state on initial load
        if (isInitial) {
            setLoading(true);
        }
        
        const { data } = await supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);
        
        setNotifications(data || []);
        
        // Only stop loading on initial load
        if (isInitial) {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;
        setSending(true);

        let targetUserId: string | null = null;

        if (mode === "user") {
            const { data } = await supabase.from("users").select("id").or(`nickname.eq.${userIdentifier.trim()},uid.eq.${userIdentifier.trim()}`).maybeSingle();
            if (!data) { toast.error("User not found."); setSending(false); return; }
            targetUserId = data.id;
        }

        const insert: any = {
            title: title.trim(),
            message: message.trim(),
            type: mode,
            target_user_id: mode === "user" ? targetUserId : null,
            target_rank: mode === "rank" ? rankTarget : null,
            priority: priority,
            icon_type: iconType,
            action_url: actionUrl.trim() || null,
            action_label: actionLabel.trim() || null,
            is_active: isActive,
        };

        const { error } = await supabase.from("notifications").insert(insert);
        if (!error) {
            toast.success("Notification sent! 📣");
            setTitle("");
            setMessage("");
            setUserIdentifier("");
            setActionUrl("");
            setActionLabel("");
            setIsActive(true);
            setPriority("normal");
            setIconType("info");
            fetchNotifications(false);
        } else {
            toast.error("Failed to send.");
        }
        setSending(false);
    };

    const toggleNotificationActive = async (id: string, current: boolean) => {
        const { error } = await supabase.from("notifications").update({ is_active: !current }).eq("id", id);
        if (!error) {
            toast.success(`Notification ${!current ? "activated" : "deactivated"}.`);
            // Update without showing loading state
            fetchNotifications(false);
        }
    };

    const deleteNotification = async (id: string) => {
        if (!confirm("Delete this notification?")) return;
        const { error } = await supabase.from("notifications").delete().eq("id", id);
        if (!error) {
            toast.success("Notification deleted.");
            fetchNotifications(false);
        }
    };

    const modes = [
        { id: "global", label: "Global", icon: Globe, desc: "All users" },
        { id: "user", label: "User", icon: User, desc: "Specific user" },
        { id: "rank", label: "By Rank", icon: Trophy, desc: "Rank group" },
    ];

    return (
        <div className="space-y-5 max-w-lg">
            <div>
                <h2 className="text-base font-bold text-white">Push Notifications</h2>
                <p className="text-xs text-gray-500 mt-0.5">Send in-app notifications to players.</p>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-2">
                {modes.map(({ id, label, icon: Icon, desc }) => (
                    <button key={id} onClick={() => setMode(id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${mode === id ? "border-red-500/40 bg-red-500/10" : "border-[#1a1a1a] bg-[#0d0d0d] hover:border-[#2a2a2a]"}`}>
                        <Icon className={`w-4 h-4 mb-1.5 ${mode === id ? "text-red-400" : "text-gray-500"}`} />
                        <p className={`text-xs font-bold ${mode === id ? "text-white" : "text-gray-400"}`}>{label}</p>
                        <p className="text-[10px] text-gray-600">{desc}</p>
                    </button>
                ))}
            </div>

            <form onSubmit={handleSend} className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-5 space-y-3">
                {mode === "user" && (
                    <input
                        type="text" placeholder="Nickname or UID" value={userIdentifier}
                        onChange={(e) => setUserIdentifier(e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                    />
                )}
                {mode === "rank" && (
                    <select value={rankTarget} onChange={(e) => setRankTarget(e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/40 transition-colors">
                        {ranks.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                )}
                <input
                    type="text" placeholder="Notification title" value={title}
                    onChange={(e) => setTitle(e.target.value)} required
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                />
                <textarea
                    placeholder="Message..." value={message} rows={3}
                    onChange={(e) => setMessage(e.target.value)} required
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors resize-none"
                />

                {/* Priority and Icon Type */}
                <div className="grid grid-cols-2 gap-3">
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}
                        className="bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/40 transition-colors">
                        {priorities.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                    <select value={iconType} onChange={(e) => setIconType(e.target.value)}
                        className="bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/40 transition-colors">
                        {iconTypes.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                </div>

                {/* Action Button */}
                <input
                    type="url" placeholder="Action URL (optional)" value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                />
                <input
                    type="text" placeholder="Button label (optional)" value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                />

                {/* Active Toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-gray-400">
                    <div
                        onClick={() => setIsActive(!isActive)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${isActive ? "bg-red-500" : "bg-[#2a2a2a]"}`}
                    >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isActive ? "left-4" : "left-0.5"}`} />
                    </div>
                    Active on load (users will see this notification)
                </label>

                <button type="submit" disabled={sending || !title.trim() || !message.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
                    style={{ background: "linear-gradient(135deg, hsl(0,85%,38%), hsl(0,85%,50%))" }}>
                    <Send className="w-4 h-4" />
                    {sending ? "Sending..." : "Send Notification"}
                </button>
            </form>

            {/* Active Notifications */}
            <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold text-white">Recent Notifications</h3>
                    <span className="text-xs text-gray-500 ml-auto">{notifications.length} notifications</span>
                </div>
                <div className="divide-y divide-[#141414]">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="px-5 py-3"><div className="h-4 bg-[#1a1a1a] rounded animate-pulse" /></div>
                        ))
                    ) : notifications.length === 0 ? (
                        <p className="text-center text-gray-600 text-xs py-6">No notifications yet</p>
                    ) : notifications.map((notif) => (
                        <div key={notif.id} className="px-5 py-3.5 hover:bg-[#111] transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-white truncate">{notif.title}</p>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${notif.priority === "urgent" ? "text-red-400 bg-red-500/15" : notif.priority === "high" ? "text-orange-400 bg-orange-500/15" : notif.priority === "normal" ? "text-blue-400 bg-blue-500/15" : "text-gray-500 bg-gray-500/15"}`}>
                                            {notif.priority.toUpperCase()}
                                        </span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${notif.type === "global" ? "text-purple-400 bg-purple-500/15" : notif.type === "user" ? "text-blue-400 bg-blue-500/15" : "text-orange-400 bg-orange-500/15"}`}>
                                            {notif.type.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-1">{notif.message}</p>
                                    <p className="text-[10px] text-gray-700 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => toggleNotificationActive(notif.id, notif.is_active)}
                                        className={`p-1.5 rounded-lg transition-colors ${notif.is_active ? "text-green-400 bg-green-500/10 hover:bg-green-500/20" : "text-gray-500 hover:text-green-400 hover:bg-green-500/10"}`}
                                    >
                                        {notif.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={() => deleteNotification(notif.id)}
                                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;
