import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, ArrowLeft, Circle, Phone, Video, Info } from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface ChatProps {
  currentUserId: string | null;
}

interface ChatUser {
  id: string;
  nickname: string;
  rank: string;
  created_at: string;
}

interface ChatListItem {
  chat_id: string;
  other_user: ChatUser;
  last_message: string;
  last_message_time: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

// ── Shared brand color (matches index.css --primary: 0 85% 50%)
const PRIMARY = "hsl(0, 85%, 50%)";
const PRIMARY_DIM = "hsla(0, 85%, 50%, 0.12)";
const PRIMARY_BORDER = "hsla(0, 85%, 50%, 0.25)";

const rankColors: Record<string, string> = {
  Platinum: "bg-cyan-500/15 text-cyan-300",
  Diamond: "bg-blue-500/15 text-blue-400",
  Heroic: "bg-red-500/15 text-red-400",
  Master: "bg-purple-500/15 text-purple-400",
  "Grand Master": "bg-orange-500/15 text-orange-400",
  // legacy fallback
  Bronze: "bg-amber-800/20 text-amber-600",
  Silver: "bg-gray-500/20 text-gray-400",
  Gold: "bg-yellow-500/20 text-yellow-400",
};

const sortedIds = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

const Chat = ({ currentUserId }: ChatProps) => {
  const [searchParams] = useSearchParams();
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [activeChat, setActiveChat] = useState<{ chatId: string; user: ChatUser } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const targetUserId = searchParams.get("user");
    const squadId = searchParams.get("squad");

    if (targetUserId && targetUserId !== currentUserId) {
      openOrCreateChat(targetUserId);
    } else if (squadId) {
      // Message button on a squad card → open DM with squad owner
      supabase
        .from("squads")
        .select("created_by")
        .eq("id", squadId)
        .single()
        .then(({ data }) => {
          if (data && data.created_by !== currentUserId) {
            openOrCreateChat(data.created_by);
          }
        });
    }
  }, [searchParams, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchChatList();
  }, [currentUserId]);

  useEffect(() => {
    if (!activeChat) return;
    fetchMessages(activeChat.chatId);
    const channel = supabase
      .channel(`rz-${activeChat.chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.chat_id === activeChat.chatId) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat?.chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeChat) setTimeout(() => inputRef.current?.focus(), 120);
  }, [activeChat?.chatId]);

  const openOrCreateChat = async (otherUserId: string) => {
    if (!currentUserId) return;
    const [u1, u2] = sortedIds(currentUserId, otherUserId);
    const { data: existing } = await supabase
      .from("chats").select("id").eq("user1_id", u1).eq("user2_id", u2).limit(1);

    let chatId: string;
    if (existing && existing.length > 0) {
      chatId = existing[0].id;
    } else {
      const { data: newChat, error } = await supabase
        .from("chats").insert({ user1_id: u1, user2_id: u2 }).select("id").single();
      if (error || !newChat) return;
      chatId = newChat.id;
    }
    const { data: userData } = await supabase
      .from("users").select("id, nickname, rank, created_at").eq("id", otherUserId).single();
    if (userData) setActiveChat({ chatId, user: userData });
  };

  const fetchChatList = async () => {
    if (!currentUserId) return;
    setLoading(true);
    const { data: chats } = await supabase
      .from("chats").select("id, user1_id, user2_id, created_at")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (!chats || chats.length === 0) { setLoading(false); return; }

    const otherUserIds = chats.map((c) => c.user1_id === currentUserId ? c.user2_id : c.user1_id);
    const { data: users } = await supabase.from("users").select("id, nickname, rank, created_at").in("id", otherUserIds);
    const userMap = new Map((users || []).map((u) => [u.id, u]));

    const chatIds = chats.map((c) => c.id);
    const { data: allMsgs } = await supabase
      .from("messages").select("id, chat_id, sender_id, message_text, created_at")
      .in("chat_id", chatIds).order("created_at", { ascending: false });

    const lastMsgMap = new Map<string, Message>();
    (allMsgs || []).forEach((m) => { if (!lastMsgMap.has(m.chat_id)) lastMsgMap.set(m.chat_id, m as Message); });

    const items: ChatListItem[] = chats
      .map((c) => {
        const otherId = c.user1_id === currentUserId ? c.user2_id : c.user1_id;
        const otherUser = userMap.get(otherId);
        if (!otherUser) return null;
        const lm = lastMsgMap.get(c.id);
        return { chat_id: c.id, other_user: otherUser, last_message: lm?.message_text || "", last_message_time: lm?.created_at || c.created_at };
      })
      .filter(Boolean) as ChatListItem[];

    items.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
    setChatList(items);
    setLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    setMsgLoading(true);
    const { data } = await supabase
      .from("messages").select("id, chat_id, sender_id, message_text, created_at")
      .eq("chat_id", chatId).order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    setMsgLoading(false);
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !activeChat || !currentUserId || sending) return;
    setNewMessage("");
    setSending(true);
    await supabase.from("messages").insert({ chat_id: activeChat.chatId, sender_id: currentUserId, message_text: text });
    setSending(false);
    inputRef.current?.focus();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts), diff = Date.now() - d.getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatMsgTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isOnline = (created_at: string) =>
    Date.now() - new Date(created_at).getTime() < 24 * 60 * 60 * 1000;

  // ─── CONVERSATION VIEW ────────────────────────────────────────────────────
  if (activeChat) {
    const { user } = activeChat;
    const online = isOnline(user.created_at);

    return (
      <div className="conversation-container bg-gradient-to-b from-background to-background/80">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveChat(null); fetchChatList(); }}
                className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Avatar & Info */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, hsl(0,85%,38%), hsl(0, 85%, 50%))` }}
                  >
                    {user.nickname[0].toUpperCase()}
                  </div>
                  {online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card shadow-sm" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-bold text-sm text-foreground">{user.nickname}</p>
                  <p className="text-xs text-muted-foreground">
                    {online ? (
                      <span className="text-green-500 font-medium">Active now</span>
                    ) : (
                      <span>Away</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all">
                <Info className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="messages-area px-4 py-4 space-y-3 flex flex-col">
          {msgLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
                <MessageCircle className="w-8 h-8 text-primary/60" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-semibold">Say hello! 👋</p>
                <p className="text-muted-foreground text-sm">Start a conversation with {user.nickname}</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === currentUserId;
                const prev = i > 0 ? messages[i - 1] : null;
                const showTimestamp = !prev || new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 300000;
                const prevSameSender = prev && prev.sender_id === msg.sender_id;
                
                return (
                  <div key={msg.id}>
                    {showTimestamp && (
                      <div className="flex justify-center my-2">
                        <span className="text-[10px] text-muted-foreground/60 bg-secondary/40 px-2 py-0.5 rounded-full">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} gap-1.5 ${i > 0 && prevSameSender ? "mt-0.5" : "mt-2"}`}>
                      {/* Avatar for other user - only show for first message in group */}
                      {!isMine && !prevSameSender && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0 shadow-sm"
                          style={{ background: `linear-gradient(135deg, hsl(0,85%,38%), hsl(0, 85%, 50%))` }}
                        >
                          {user.nickname[0].toUpperCase()}
                        </div>
                      )}
                      {!isMine && prevSameSender && <div className="w-6" />}
                      
                      <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[75%]`}>
                        <div
                          className="px-4 py-2.5 text-sm leading-relaxed shadow-md rounded-3xl transition-all hover:shadow-lg"
                          style={{
                            background: isMine
                              ? `linear-gradient(135deg, hsl(0,85%,45%), hsl(0, 85%, 55%))`
                              : "hsl(var(--secondary))/80",
                            color: isMine ? "#fff" : "hsl(var(--foreground))",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          {msg.message_text}
                        </div>
                        <span className="text-[11px] text-muted-foreground/60 mt-1 px-2">
                          {formatMsgTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="pt-4" />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="messenger-input-container bg-card/80 backdrop-blur-lg border-t border-border/30 shadow-lg">
          <div className="px-4 py-3 max-w-4xl mx-auto safe-left safe-right">
            <div className="flex gap-2.5 items-center">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Message..."
                className="flex-1 text-sm bg-secondary/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all py-2.5 px-4 rounded-3xl border border-primary/0 focus:border-primary/40 h-10 focus:bg-secondary/80"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40 active:scale-90 hover:scale-110 shadow-md hover:shadow-lg"
                style={{
                  background: newMessage.trim() 
                    ? `linear-gradient(135deg, hsl(0,85%,45%), hsl(0, 85%, 55%))`
                    : "hsl(var(--secondary))",
                }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── CHAT LIST VIEW ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Chat</h1>
              <p className="text-xs text-muted-foreground/70">
                {chatList.length === 0 ? "No conversations yet" : `${chatList.length} conversation${chatList.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button className="p-2 rounded-full bg-secondary/60 hover:bg-primary/20 transition-all">
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground/50 rounded-full py-2.5 px-4 focus:outline-none border border-transparent focus:border-primary/40 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div>
        {loading ? (
          // Skeleton loader
          <div className="space-y-2 px-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-secondary/40 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-secondary/40 rounded-full animate-pulse w-1/3" />
                  <div className="h-2.5 bg-secondary/30 rounded-full animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : chatList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-6 text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
              <MessageCircle className="w-10 h-10 text-primary/40" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-lg mb-1">No messages yet</p>
              <p className="text-muted-foreground text-sm">Start a conversation by messaging players from the Home feed</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {chatList.map((item) => {
              const online = isOnline(item.other_user.created_at);
              return (
                <button
                  key={item.chat_id}
                  onClick={() => setActiveChat({ chatId: item.chat_id, user: item.other_user })}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-secondary/40 active:bg-secondary/60 transition-all text-left group"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md group-hover:shadow-lg transition-shadow"
                      style={{ background: `linear-gradient(135deg, hsl(0,85%,38%), hsl(0, 85%, 50%))` }}
                    >
                      {item.other_user.nickname[0].toUpperCase()}
                    </div>
                    {online && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {item.other_user.nickname}
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${rankColors[item.other_user.rank] || "bg-secondary text-foreground"}`}>
                          {item.other_user.rank}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground/60 flex-shrink-0 group-hover:text-foreground transition-colors">
                        {formatTime(item.last_message_time)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/80 truncate group-hover:text-muted-foreground transition-colors">
                      {item.last_message || <span className="italic">Tap to start chatting 💬</span>}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
