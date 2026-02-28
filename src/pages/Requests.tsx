import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Users } from "lucide-react";
import { toast } from "sonner";

interface RequestsProps {
  currentUserId: string | null;
}

interface SquadRequest {
  id: string;
  status: string;
  from_user: { id: string; nickname: string; rank: string; role: string };
}

const Requests = ({ currentUserId }: RequestsProps) => {
  const [requests, setRequests] = useState<SquadRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUserId) fetchRequests();
  }, [currentUserId]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("squad_requests")
      .select("id, status, from_user_id")
      .eq("to_user_id", currentUserId!)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch user details for each request
      const userIds = data.map((r) => r.from_user_id);
      const { data: users } = await supabase.from("users").select("id, nickname, rank, role").in("id", userIds);
      const userMap = new Map(users?.map((u) => [u.id, u]) || []);

      setRequests(
        data.map((r) => ({
          id: r.id,
          status: r.status,
          from_user: userMap.get(r.from_user_id) || { id: r.from_user_id, nickname: "Unknown", rank: "", role: "" },
        }))
      );
    }
    setLoading(false);
  };

  const handleRequest = async (requestId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("squad_requests").update({ status }).eq("id", requestId);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success(status === "accepted" ? "Request accepted! 🤝" : "Request rejected");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="gaming-title text-base text-foreground">Squad Requests</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm">No pending requests</p>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="card-gaming p-4 flex items-center justify-between animate-slide-up">
              <div>
                <p className="font-semibold text-sm text-foreground">{req.from_user.nickname}</p>
                <p className="text-xs text-muted-foreground">{req.from_user.rank} • {req.from_user.role}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRequest(req.id, "accepted")}
                  className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRequest(req.id, "rejected")}
                  className="p-2 rounded-lg bg-destructive/10 text-red-500 hover:bg-destructive/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Requests;
