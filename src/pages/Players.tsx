import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PlayerCard from "@/components/PlayerCard";
import AdBanner from "@/components/AdBanner";
import { Users as UsersIcon, Search, Users, Flame, Wifi, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlayersProps {
  currentUserId: string | null;
}

interface Player {
  id: string;
  nickname: string;
  uid: string;
  rank: string;
  role: string;
  kd_ratio: string;
  language: string;
  created_at: string;
  is_vip?: boolean;
}

type FilterKey = "rank" | "role" | "language";

interface Filters {
  rank: string;
  role: string;
  language: string;
}

const RANKS = ["All", "Platinum", "Diamond", "Heroic", "Master", "Grand Master"];
const ROLES = ["All", "Rusher", "Sniper", "Support"];
const LANGUAGES = ["All", "Bangla", "English", "Hindi"];

const FILTER_OPTIONS: Record<FilterKey, string[]> = { rank: RANKS, role: ROLES, language: LANGUAGES };
const FILTER_LABELS: Record<FilterKey, string> = { rank: "Rank", role: "Role", language: "Language" };

const Players = ({ currentUserId }: PlayersProps) => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ rank: "All", role: "All", language: "All" });
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, [currentUserId]);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, nickname, uid, rank, role, kd_ratio, language, created_at, is_vip")
      .order("created_at", { ascending: false });
    
    if (data) {
      // Normalize data to ensure all required fields have values
      const normalizedData = data.map((p: any) => ({
        id: p.id,
        nickname: p.nickname || "Unknown",
        uid: p.uid || "N/A",
        rank: p.rank || "Bronze",
        role: p.role || "Rusher",
        kd_ratio: p.kd_ratio || "1.0",
        language: p.language || "English",
        created_at: p.created_at,
        is_vip: p.is_vip || false,
      }));
      setPlayers(normalizedData);
    }
    setLoading(false);
  };

  const filtered = players.filter((p) => {
    if (p.id === currentUserId) return false;
    const q = search.toLowerCase();
    if (q && !p.nickname.toLowerCase().includes(q) && !p.uid.toLowerCase().includes(q)) return false;
    if (filters.rank !== "All" && p.rank !== filters.rank) return false;
    if (filters.role !== "All" && p.role !== filters.role) return false;
    if (filters.language !== "All" && p.language !== filters.language) return false;
    return true;
  });

  // Stats
  const totalPlayers = players.length;
  const now = Date.now();
  const activePlayers = players.filter((p) => now - new Date(p.created_at).getTime() < 24 * 60 * 60 * 1000).length;
  const heroicPlayers = players.filter((p) => p.rank === "Heroic").length;

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden bg-background">
      {/* Background glow shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, hsl(0,85%,50%), transparent 70%)" }} />
        <div className="absolute top-1/3 -right-24 w-56 h-56 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, hsl(210,90%,55%), transparent 70%)" }} />
        <div className="absolute bottom-20 left-1/4 w-48 h-48 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, hsl(0,85%,50%), transparent 70%)" }} />
      </div>

      {/* Filter dropdown modal */}
      {activeFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setActiveFilter(null)}>
          <div className="w-full max-w-md bg-card border-t border-border rounded-t-2xl p-4 pb-8 space-y-2 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
            <p className="gaming-title text-sm text-foreground text-center mb-3">{FILTER_LABELS[activeFilter]}</p>
            {FILTER_OPTIONS[activeFilter].map((opt) => (
              <button
                key={opt}
                onClick={() => { setFilters((f) => ({ ...f, [activeFilter]: opt })); setActiveFilter(null); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${filters[activeFilter] === opt ? "bg-primary/20 text-primary font-semibold" : "text-foreground hover:bg-secondary"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <UsersIcon className="w-5 h-5 text-primary" />
          <h1 className="gaming-title text-base text-foreground">Find Players</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nickname or UID..."
            className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="relative z-10 px-4 py-4 space-y-4">
        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex-shrink-0 ${filters[key] !== "All"
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}
            >
              {FILTER_LABELS[key]}{filters[key] !== "All" ? `: ${filters[key]}` : ""}
              <ChevronDown className="w-3 h-3" />
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={<Users className="w-4 h-4 text-primary" />} label="Players" value={totalPlayers} />
          <StatCard icon={<Wifi className="w-4 h-4" style={{ color: "hsl(210,90%,55%)" }} />} label="Online" value={activePlayers} />
          <StatCard icon={<Flame className="w-4 h-4 text-primary" />} label="Heroic" value={heroicPlayers} />
        </div>

        <AdBanner />

        {/* Player List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No players found</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((player) => (
              <PlayerCard
                key={player.id}
                {...player}
                onMessage={() => navigate(`/chat?user=${player.id}`, { replace: false })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="border border-border rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 12px hsl(0,85%,50%,0.04)" }}>
    {icon}
    <div>
      <p className="text-base font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  </div>
);

export default Players;
