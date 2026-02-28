import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Globe, User, Trophy } from "lucide-react";
import { toast } from "sonner";

const ranks = ["Platinum", "Diamond", "Heroic", "Master", "Grand Master"];

const AdminNotifications = () => {
    const [mode, setMode] = useState<"global" | "user" | "rank">("global");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [userIdentifier, setUserIdentifier] = useState("");
    const [rankTarget, setRankTarget] = useState("Heroic");
    const [sending, setSending] = useState(false);

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
            is_read: false,
        };

        const { error } = await supabase.from("notifications").insert(insert);
        if (!error) {
            toast.success("Notification sent! 📣");
            setTitle(""); setMessage(""); setUserIdentifier("");
        } else {
            toast.error("Failed to send.");
        }
        setSending(false);
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
                <button type="submit" disabled={sending || !title.trim() || !message.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
                    style={{ background: "linear-gradient(135deg, hsl(0,85%,38%), hsl(0,85%,50%))" }}>
                    <Send className="w-4 h-4" />
                    {sending ? "Sending..." : "Send Notification"}
                </button>
            </form>
        </div>
    );
};

export default AdminNotifications;
