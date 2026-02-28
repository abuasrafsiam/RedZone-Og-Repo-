import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gamepad2, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

async function hashPassword(password: string): Promise<string> {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(password));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ResetPassword = () => {
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim() || !newPassword || !confirmPassword) return;
        if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
        if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }

        setLoading(true);

        // Check user exists by nickname OR uid
        const { data: user } = await supabase
            .from("users")
            .select("id")
            .or(`nickname.eq.${identifier.trim()},uid.eq.${identifier.trim()}`)
            .maybeSingle();

        if (!user) {
            toast.error("No account found with that Nickname or UID.");
            setLoading(false);
            return;
        }

        const hashed = await hashPassword(newPassword);
        const { error } = await supabase
            .from("users")
            .update({ password_hash: hashed })
            .eq("id", user.id);

        if (!error) {
            setDone(true);
        } else {
            toast.error("Reset failed. Try again.");
        }
        setLoading(false);
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #080808 0%, #111111 100%)" }}
        >
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-[0.06]"
                    style={{ background: "radial-gradient(circle, hsl(0,85%,50%), transparent 70%)" }} />
            </div>

            <div className="w-full max-w-sm relative z-10">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3 border border-primary/20"
                        style={{ boxShadow: "0 0 20px hsla(0,85%,50%,0.2)" }}>
                        <KeyRound className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="gaming-title text-xl text-foreground">Reset Password</h1>
                    <p className="text-sm text-muted-foreground mt-1.5">Enter your Nickname or UID to reset.</p>
                </div>

                {done ? (
                    <div className="text-center py-8 space-y-4 animate-in fade-in duration-300">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <div>
                            <p className="text-foreground font-bold text-lg">Password Reset! 🔥</p>
                            <p className="text-muted-foreground text-sm mt-1">You can now log in with your new password.</p>
                        </div>
                        <button
                            onClick={() => navigate("/")}
                            className="w-full py-3 btn-gaming rounded-xl text-sm mt-2"
                        >
                            Go to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Nickname or UID</label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Enter your nickname or UID"
                                required
                                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Min 6 characters"
                                    required
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                />
                                <button type="button" onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    required
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-[11px] text-red-400 mt-1">Passwords don't match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !identifier.trim() || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            className="w-full py-3 btn-gaming rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? "Resetting..." : "Reset Password 🔑"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
