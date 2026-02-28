import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface AdminLoginProps {
    onLogin: (userId: string) => void;
}

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim() || !password.trim()) return;
        setLoading(true);

        const { data, error } = await supabase
            .from("users")
            .select("id, is_admin")
            .or(`nickname.eq.${identifier.trim()},uid.eq.${identifier.trim()}`)
            .maybeSingle();

        if (!data || error) {
            toast.error("User not found.");
            setLoading(false);
            return;
        }

        if (!data.is_admin) {
            toast.error("Access denied. Admin only.");
            setLoading(false);
            return;
        }

        onLogin(data.id);
        toast.success("Welcome, Admin 🔥");
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#070707] px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4"
                        style={{ boxShadow: "0 0 30px hsla(0,85%,50%,0.2)" }}>
                        <Shield className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">RedZone <span className="text-red-500">Admin</span></h1>
                    <p className="text-sm text-gray-500 mt-1">Restricted access. Admin only.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 font-medium">Nickname or UID</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Admin nickname or UID"
                            required
                            className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Admin password"
                                required
                                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !identifier.trim() || !password.trim()}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        style={{ background: "linear-gradient(135deg, hsl(0,85%,38%), hsl(0,85%,50%))", boxShadow: "0 0 20px hsla(0,85%,50%,0.3)" }}
                    >
                        {loading ? "Authenticating..." : "Access Admin Panel →"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
