import { Crosshair, Globe, MessageCircle, Star } from "lucide-react";

interface PlayerCardProps {
  nickname: string;
  rank: string;
  role: string;
  kd_ratio: string;
  language: string;
  is_vip: boolean;
  created_at: string;
  onMessage: () => void;
}

const rankColors: Record<string, string> = {
  Platinum: "bg-cyan-500/15 text-cyan-300",
  Diamond: "bg-blue-500/15 text-blue-400",
  Heroic: "bg-red-500/15 text-red-400",
  Master: "bg-purple-500/15 text-purple-400",
  "Grand Master": "bg-orange-500/15 text-orange-400",
  // legacy
  Bronze: "bg-amber-800/20 text-amber-600",
  Silver: "bg-gray-500/20 text-gray-400",
  Gold: "bg-yellow-500/20 text-yellow-400",
};

const PlayerCard = ({ nickname, rank, role, kd_ratio, language, is_vip, created_at, onMessage }: PlayerCardProps) => {
  const now = Date.now();
  const isOnline = now - new Date(created_at).getTime() < 24 * 60 * 60 * 1000;
  const initial = nickname.charAt(0).toUpperCase();

  return (
    <div
      className="rounded-2xl p-4 space-y-3 border border-border/60 relative overflow-hidden bg-card shadow-card-gaming"
    >
      {is_vip && (
        <div className="absolute top-3 right-3">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{initial}</span>
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background" style={{ background: "hsl(140,70%,45%)" }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="gaming-title text-sm text-foreground truncate">{nickname}</h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${rankColors[rank] || "bg-secondary text-foreground"}`}>
              {rank}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground">
              <Crosshair className="w-2.5 h-2.5" /> {role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono text-foreground">K/D {kd_ratio}</span>
        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {language}</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onMessage}
          className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 text-primary-foreground"
          style={{ background: "linear-gradient(135deg, hsl(0,60%,30%), hsl(0,85%,50%))" }}
        >
          <MessageCircle className="w-3.5 h-3.5" /> Message
        </button>
      </div>
    </div>
  );
};

export default PlayerCard;
