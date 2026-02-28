import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const AdminChats = () => {
    const [chats, setChats] = useState<any[]>([]);
    const [messages, setMessages] = useState<Record<string, any[]>>({});
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchChats(); }, []);

    const fetchChats = async () => {
        setLoading(true);
        const { data: chatData } = await supabase
            .from("chats").select("id, user1_id, user2_id, created_at")
            .order("created_at", { ascending: false });

        if (!chatData) { setLoading(false); return; }

        const allUserIds = [...new Set(chatData.flatMap((c) => [c.user1_id, c.user2_id]))];
        const { data: users } = await supabase.from("users").select("id, nickname").in("id", allUserIds);
        const userMap = new Map((users || []).map((u) => [u.id, u.nickname]));

        setChats(chatData.map((c) => ({
            ...c,
            user1_name: userMap.get(c.user1_id) || "Unknown",
            user2_name: userMap.get(c.user2_id) || "Unknown",
        })));
        setLoading(false);
    };

    const loadMessages = async (chatId: string) => {
        if (expanded === chatId) { setExpanded(null); return; }
        setExpanded(chatId);
        if (messages[chatId]) return;
        const { data } = await supabase
            .from("messages").select("id, sender_id, message_text, created_at")
            .eq("chat_id", chatId).order("created_at", { ascending: true });
        setMessages((prev) => ({ ...prev, [chatId]: data || [] }));
    };

    const deleteChat = async (chatId: string) => {
        if (!confirm("Delete this chat and all its messages?")) return;
        await supabase.from("chats").delete().eq("id", chatId);
        toast.success("Chat deleted.");
        setChats((prev) => prev.filter((c) => c.id !== chatId));
    };

    const deleteMessage = async (msgId: string, chatId: string) => {
        await supabase.from("messages").delete().eq("id", msgId);
        toast.success("Message deleted.");
        setMessages((prev) => ({ ...prev, [chatId]: prev[chatId].filter((m) => m.id !== msgId) }));
    };

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-bold text-white">Chat Management</h2>
                <p className="text-xs text-gray-500 mt-0.5">{chats.length} total chats</p>
            </div>

            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />
                    ))
                ) : chats.map((chat) => (
                    <div key={chat.id} className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3.5">
                            <button onClick={() => loadMessages(chat.id)} className="flex-1 flex items-center gap-2 text-left">
                                <div className="flex items-center gap-1.5 text-sm text-white font-medium">
                                    <span className="text-blue-400">{chat.user1_name}</span>
                                    <span className="text-gray-600">↔</span>
                                    <span className="text-green-400">{chat.user2_name}</span>
                                </div>
                                <span className="ml-auto text-[10px] text-gray-600">{new Date(chat.created_at).toLocaleDateString()}</span>
                                {expanded === chat.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </button>
                            <button onClick={() => deleteChat(chat.id)}
                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {expanded === chat.id && (
                            <div className="border-t border-[#1a1a1a] px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
                                {(messages[chat.id] || []).length === 0 ? (
                                    <p className="text-xs text-gray-600 text-center py-4">No messages</p>
                                ) : (messages[chat.id] || []).map((msg) => (
                                    <div key={msg.id} className="flex items-start gap-2 group">
                                        <p className="flex-1 text-xs text-gray-300">{msg.message_text}</p>
                                        <span className="text-[9px] text-gray-600 flex-shrink-0">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        <button onClick={() => deleteMessage(msg.id, chat.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-600 hover:text-red-400 transition-all">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminChats;
