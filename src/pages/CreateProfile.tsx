import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gamepad2, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CreateProfileProps {
  onCreated: (id: string) => void;
}

const CreateProfile = ({ onCreated }: CreateProfileProps) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [nickname, setNickname] = useState("");
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [rank, setRank] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ranks, setRanks] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // Set fallback defaults first
    setRanks(["Diamond", "Heroic", "Master"]);
    setRoles(["Rusher", "Support", "Bomber", "Sniper"]);
    setRank("Diamond");
    setRole("Rusher");

    try {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["signup_ranks", "signup_roles"]);
      
      if (data && data.length > 0) {
        data.forEach((setting) => {
          if (setting.key === "signup_ranks") {
            const rankList = setting.value.split(",").map((r) => r.trim()).filter(r => r);
            if (rankList.length > 0) {
              setRanks(rankList);
              setRank(rankList[0]);
            }
          }
          if (setting.key === "signup_roles") {
            const roleList = setting.value.split(",").map((r) => r.trim()).filter(r => r);
            if (roleList.length > 0) {
              setRoles(roleList);
              setRole(roleList[0]);
            }
          }
        });
      }
    } catch (err) {
      console.error("Error fetching settings, using defaults:", err);
    }
  };

  const hashPassword = async (plain: string): Promise<string> => {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(plain));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !uid.trim() || !password.trim() || !rank || !role) return;
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setLoading(true);
    const hashed = await hashPassword(password);
    const { data, error } = await supabase.from("users").insert({
      nickname: nickname.trim(),
      uid: uid.trim(),
      password_hash: hashed,
      rank: rank,
      kd_ratio: "1.0",
      role: role,
      language: "English",
      play_time: "Anytime",
      is_vip: false,
      is_admin: false,
      is_banned: false,
    }).select("id").single();
    if (data && !error) {
      onCreated(data.id);
      toast.success("Profile created! Welcome to RedZone 🔥");
    } else {
      toast.error(error?.message || "Signup failed. Try again.");
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !password.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .or(`nickname.eq.${nickname.trim()},uid.eq.${nickname.trim()}`)
      .maybeSingle();
    if (data && !error) {
      onCreated(data.id);
      toast.success("Welcome back! 🔥");
    } else {
      toast.error("User not found. Check your Nickname or UID.");
    }
    setLoading(false);
  };

  const canSubmit = isLogin
    ? nickname.trim() && password.trim()
    : nickname.trim() && uid.trim() && password.trim() && !!rank && !!role;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #080808 0%, #111111 100%)" }}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, hsl(0,85%,50%), transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 glow-red border border-primary/20">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="gaming-title text-2xl text-foreground glow-red-text">RedZone</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isLogin ? "Log in to your account" : "Create your player profile"}
          </p>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-3.5">
          {/* Nickname / UID */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
              {isLogin ? "Nickname or UID" : "Nickname"}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={isLogin ? "Enter nickname or UID" : "Your gamer tag"}
              required
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* UID — signup only */}
          {!isLogin && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Free Fire UID</label>
              <input
                type="text"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="Your in-game UID"
                required
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {/* Rank — signup only */}
          {!isLogin && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Rank</label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                required
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="" disabled>Select your rank</option>
                {ranks.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* Role — signup only */}
          {!isLogin && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="" disabled>Select your role</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" /> Password
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => navigate("/reset-password")}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "Your password" : "Min 6 characters"}
                required
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full py-3 btn-gaming rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? (isLogin ? "Logging in..." : "Creating profile...")
              : (isLogin ? "Log In 🎮" : "Join the Squad 🔥")}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setPassword(""); }}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? "Create Profile" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default CreateProfile;
