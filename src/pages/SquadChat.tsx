import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, ArrowLeft, AlertCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useChatContext } from "@/context/ChatContext";

interface SquadChatProps {
  currentUserId: string | null;
}

interface Squad {
  id: string;
  squad_name: string;
  created_by: string;
}

interface SquadMessage {
  id: string;
  squad_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  sender?: { nickname: string; rank: string };
}

interface SquadMember {
  user_id: string;
  user: { id: string; nickname: string; rank: string };
}

interface UserInfo {
  id: string;
  nickname: string;
  rank: string;
}

interface MessageRow {
  id: string;
  squad_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

const PRIMARY = "hsl(0, 85%, 50%)";
const PRIMARY_DIM = "hsla(0, 85%, 50%, 0.12)";
const PRIMARY_BORDER = "hsla(0, 85%, 50%, 0.25)";

const SquadChat = ({ currentUserId }: SquadChatProps) => {
  const { squadId } = useParams<{ squadId: string }>();
  const navigate = useNavigate();
  const { setIsInConversation } = useChatContext();
  
  const [squad, setSquad] = useState<Squad | null>(null);
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [isSquadMember, setIsSquadMember] = useState(false);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Set conversation state when entering squad chat
  useEffect(() => {
    setIsInConversation(true);
    return () => setIsInConversation(false);
  }, [setIsInConversation]);

  // Check if user is squad member and load squad info
  const checkAccessAndLoadSquad = useCallback(async () => {
    if (!squadId || !currentUserId) return;
    try {
      setLoading(true);
      
      // Check if squad exists
      const { data: squadData, error: squadError } = await supabase
        .from("squads")
        .select("id, squad_name, created_by")
        .eq("id", squadId)
        .single();

      if (squadError || !squadData) {
        setError("Squad not found");
        setLoading(false);
        return;
      }

      setSquad(squadData as Squad);

      // Check if current user is a squad member
      const { data: memberData, error: memberError } = await supabase
        .from("squad_members")
        .select("user_id")
        .eq("squad_id", squadId)
        .eq("user_id", currentUserId);

      if (memberError || !memberData || memberData.length === 0) {
        setError("You are not a member of this squad");
        setLoading(false);
        return;
      }

      setIsSquadMember(true);

      // Fetch squad members for context
      const { data: members } = await supabase
        .from("squad_members")
        .select(
          `
          user_id,
          user:users!squad_members_user_id_fkey (
            id,
            nickname,
            rank
          )
        `
        )
        .eq("squad_id", squadId);

      if (members) {
        const typedMembers = members.map((m) => {
          const memberRecord = m as Record<string, unknown>;
          const userRecord = memberRecord.user as Record<string, unknown>;
          return {
            user_id: memberRecord.user_id as string,
            user: {
              id: userRecord.id as string,
              nickname: (userRecord.nickname as string) || "Unknown",
              rank: (userRecord.rank as string) || "",
            },
          };
        });
        setSquadMembers(typedMembers);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error checking access:", err);
      setError("Error accessing squad chat");
      setLoading(false);
    }
  }, [squadId, currentUserId]);

  useEffect(() => {
    checkAccessAndLoadSquad();
  }, [checkAccessAndLoadSquad]);

  // Load messages when squad is confirmed accessible
  const fetchMessages = useCallback(async () => {
    if (!squadId) return;
    setMsgLoading(true);
    try {
      const result = await supabase
        .from("messages")
        .select("id, squad_id, sender_id, message_text, created_at")
        .match({ squad_id: squadId, chat_type: "squad" })
        .order("created_at", { ascending: true });

      const { data } = result as { data: MessageRow[] | null };

      if (data) {
        // Fetch sender info separately
        const senderIds = Array.from(new Set(data.map((m) => m.sender_id)));
        const { data: senders } = await supabase
          .from("users")
          .select("id, nickname, rank")
          .in("id", senderIds);

        const senderMap = new Map<string, UserInfo>();
        if (senders) {
          (senders as UserInfo[]).forEach((s) => {
            senderMap.set(s.id, s);
          });
        }

        const processedMessages = data.map((m) => ({
          id: m.id,
          squad_id: m.squad_id,
          sender_id: m.sender_id,
          message_text: m.message_text,
          created_at: m.created_at,
          sender: senderMap.get(m.sender_id) || { id: "", nickname: "Unknown", rank: "" },
        }));

        setMessages(processedMessages);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
    setMsgLoading(false);
  }, [squadId]);

  useEffect(() => {
    if (!isSquadMember || !squadId) return;
    fetchMessages();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`squad-chat-${squadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `squad_id=eq.${squadId}`,
        },
        (payload) => {
          const msgRecord = payload.new as Record<string, unknown>;
          const msg: MessageRow = {
            id: msgRecord.id as string,
            squad_id: msgRecord.squad_id as string,
            sender_id: msgRecord.sender_id as string,
            message_text: msgRecord.message_text as string,
            created_at: msgRecord.created_at as string,
          };
          // Fetch sender info
          supabase
            .from("users")
            .select("id, nickname, rank")
            .eq("id", msg.sender_id)
            .single()
            .then(({ data: sender }) => {
              const senderInfo: UserInfo = sender as UserInfo || { id: "", nickname: "Unknown", rank: "" };
              setMessages((prev) =>
                prev.some((m) => m.id === msg.id)
                  ? prev
                  : [
                      ...prev,
                      {
                        id: msg.id,
                        squad_id: msg.squad_id,
                        sender_id: msg.sender_id,
                        message_text: msg.message_text,
                        created_at: msg.created_at,
                        sender: senderInfo,
                      },
                    ]
              );
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSquadMember, squadId, fetchMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto focus input
  useEffect(() => {
    if (isSquadMember) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isSquadMember]);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !currentUserId || !squadId || sending || !isSquadMember)
      return;

    setNewMessage("");
    setSending(true);

    try {
      const result = await supabase.from("messages").insert({
        squad_id: squadId,
        sender_id: currentUserId,
        message_text: text,
        chat_type: "squad",
        chat_id: null,
        receiver_id: null,
      });
      if (result.error) {
        toast.error("Failed to send message");
        setNewMessage(text);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
      setNewMessage(text);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts),
      diff = Date.now() - d.getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const rankColors: Record<string, string> = {
    Platinum: "bg-cyan-500/15 text-cyan-300",
    Diamond: "bg-blue-500/15 text-blue-400",
    Heroic: "bg-red-500/15 text-red-400",
    Master: "bg-purple-500/15 text-purple-400",
    "Grand Master": "bg-orange-500/15 text-orange-400",
    Bronze: "bg-amber-800/20 text-amber-600",
    Silver: "bg-gray-500/20 text-gray-400",
    Gold: "bg-yellow-500/20 text-yellow-400",
  };

  const formatMsgTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: `${PRIMARY} transparent transparent transparent` }} />
          <p className="text-muted-foreground text-sm">Loading squad chat...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !isSquadMember || !squad) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "hsl(var(--background))" }}>
        <div className="text-center space-y-6 max-w-sm">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: PRIMARY_DIM, border: `1px solid ${PRIMARY_BORDER}` }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: PRIMARY }} />
          </div>
          <div>
            <h2 className="text-foreground font-bold text-lg mb-1">Access Denied</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {error || "You don't have access to this squad chat"}
            </p>
          </div>
          <button
            onClick={() => navigate("/squads")}
            className="w-full py-2.5 text-sm font-semibold rounded-xl text-white transition-all"
            style={{
              background: `linear-gradient(135deg, hsl(0,85%,38%), ${PRIMARY})`,
            }}
          >
            Back to Squads
          </button>
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div
      className="flex flex-col"
      style={{ minHeight: "100dvh", background: "hsl(var(--background))" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border"
        style={{ background: "hsl(var(--card))", backdropFilter: "blur(16px)" }}
      >
        <button
          onClick={() => navigate("/squads")}
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg, hsl(0,85%,38%), ${PRIMARY})` }}
        >
          {squad.squad_name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">
            {squad.squad_name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {squadMembers.length} member{squadMembers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        style={{ paddingBottom: "120px" }}
      >
        {msgLoading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: `${PRIMARY} transparent transparent transparent`,
              }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: PRIMARY_DIM,
                border: `1px solid ${PRIMARY_BORDER}`,
              }}
            >
              <MessageCircle
                className="w-6 h-6"
                style={{ color: PRIMARY }}
              />
            </div>
            <p className="text-muted-foreground text-xs text-center">
              Welcome to <span className="text-foreground font-semibold">{squad.squad_name}</span> 🎮
            </p>
            <p className="text-muted-foreground text-[10px]">
              Start chatting with your squad members!
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === currentUserId;
            const prev = i > 0 ? messages[i - 1] : null;
            const showTimeDivider =
              !prev ||
              new Date(msg.created_at).getTime() -
                new Date(prev.created_at).getTime() >
                300000;

            return (
              <div key={msg.id}>
                {showTimeDivider && (
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-[10px] text-muted-foreground px-2">
                      {formatTime(msg.created_at)}
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                )}
                <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                  <div
                    className="max-w-[75%] flex flex-col"
                    style={{
                      alignItems: isMine ? "flex-end" : "flex-start",
                    }}
                  >
                    {/* Sender name */}
                    <div className="px-4 mb-1 flex items-center gap-1">
                      <span className="text-xs font-semibold text-foreground">
                        {isMine ? "You" : msg.sender?.nickname || "Unknown"}
                      </span>
                      {msg.sender?.rank && (
                        <span
                          className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                            rankColors[msg.sender.rank] ||
                            "bg-secondary text-foreground"
                          }`}
                        >
                          {msg.sender.rank}
                        </span>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div
                      className="px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        borderRadius: isMine
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                        background: isMine
                          ? `linear-gradient(135deg, hsl(0,85%,38%), ${PRIMARY})`
                          : "hsl(var(--secondary))",
                        color: isMine ? "#fff" : "hsl(var(--foreground))",
                        boxShadow: isMine
                          ? "0 2px 10px hsla(0,85%,50%,0.22)"
                          : "0 1px 3px rgba(0,0,0,0.3)",
                        border: isMine ? "none" : "1px solid hsl(var(--border))",
                      }}
                    >
                      {msg.message_text}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[9px] text-muted-foreground mt-1 px-2">
                      {formatMsgTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-border"
        style={{
          background: "hsl(var(--card))",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
        }}
      >
        <div className="flex gap-2 items-center max-w-lg mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && sendMessage()
            }
            placeholder="Type a message..."
            className="flex-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
            style={{
              background: "hsl(var(--secondary))",
              border: "1.5px solid hsl(var(--border))",
              borderRadius: "24px",
              padding: "10px 18px",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending || !isSquadMember}
            className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30 active:scale-95 hover:brightness-110"
            style={{
              background: `linear-gradient(135deg, hsl(0,85%,38%), ${PRIMARY})`,
              boxShadow: newMessage.trim()
                ? "0 0 14px hsla(0,85%,50%,0.35)"
                : "none",
            }}
          >
            <Send
              className="w-4 h-4 text-white"
              style={{ transform: "translateX(1px)" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SquadChat;
