import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const positions = ["home", "chat", "popup"];

const AdminAds = () => {
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ image_url: "", redirect_url: "", position: "home", is_active: true });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchAds(); }, []);

    const fetchAds = async () => {
        setLoading(true);
        const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
        setAds(data || []);
        setLoading(false);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.image_url.trim()) return;
        setSaving(true);
        await supabase.from("ads").insert(form);
        toast.success("Ad added!");
        setForm({ image_url: "", redirect_url: "", position: "home", is_active: true });
        fetchAds();
        setSaving(false);
    };

    const toggleAd = async (id: string, current: boolean) => {
        await supabase.from("ads").update({ is_active: !current }).eq("id", id);
        fetchAds();
    };

    const deleteAd = async (id: string) => {
        if (!confirm("Delete this ad?")) return;
        await supabase.from("ads").delete().eq("id", id);
        toast.success("Ad deleted.");
        fetchAds();
    };

    const positionColors: Record<string, string> = {
        home: "text-blue-400 bg-blue-500/10",
        chat: "text-green-400 bg-green-500/10",
        popup: "text-purple-400 bg-purple-500/10",
    };

    return (
        <div className="space-y-5">
            {/* Form */}
            <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-red-500" /> Add New Ad
                </h3>
                <form onSubmit={save} className="space-y-3">
                    <input
                        type="url" placeholder="Image URL (https://...)" value={form.image_url}
                        onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} required
                        className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                    />
                    <input
                        type="url" placeholder="Redirect URL (https://...) — optional" value={form.redirect_url}
                        onChange={(e) => setForm((f) => ({ ...f, redirect_url: e.target.value }))}
                        className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                    />
                    <div className="flex gap-3">
                        <select value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                            className="flex-1 bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/40 transition-colors">
                            {positions.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-400">
                            <div onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                                className={`w-9 h-5 rounded-full transition-colors relative ${form.is_active ? "bg-red-500" : "bg-[#2a2a2a]"}`}>
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? "left-4" : "left-0.5"}`} />
                            </div>
                            Active
                        </label>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg, hsl(0,85%,38%), hsl(0,85%,50%))" }}>
                            {saving ? "Adding..." : "Add Ad"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Ad list */}
            <div className="grid gap-3 sm:grid-cols-2">
                {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-40 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />
                    ))
                ) : ads.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-8 col-span-2">No ads yet</p>
                ) : ads.map((ad) => (
                    <div key={ad.id} className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                        {/* Preview */}
                        <div className="w-full h-32 bg-[#111] relative overflow-hidden">
                            <img src={ad.image_url} alt="Ad" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <div className="absolute top-2 right-2 flex gap-1.5">
                                <button onClick={() => toggleAd(ad.id, ad.is_active)}
                                    className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${ad.is_active ? "text-green-400 bg-black/50 hover:bg-black/70" : "text-gray-500 bg-black/50 hover:bg-black/70"}`}>
                                    {ad.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => deleteAd(ad.id)} className="p-1.5 rounded-lg backdrop-blur-sm bg-black/50 hover:bg-black/70 text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="px-3 py-2.5 flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${positionColors[ad.position] || ""}`}>{ad.position}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ad.is_active ? "text-green-400 bg-green-500/10" : "text-gray-500 bg-gray-500/10"}`}>
                                {ad.is_active ? "Active" : "Paused"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminAds;
