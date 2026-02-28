import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, RefreshCw, Volume } from "lucide-react";
import { toast } from "sonner";
import { useAdSettings } from "@/hooks/useAdSettings";

const defaultSettings = [
    { key: "app_name", value: "RedZone", label: "App Name", hint: "Displayed in header and title" },
    { key: "maintenance_mode", value: "false", label: "Maintenance Mode", hint: "\"true\" to show maintenance screen" },
    { key: "primary_color", value: "hsl(0,85%,50%)", label: "Primary Color", hint: "CSS color value for red theme" },
    { key: "chat_enabled", value: "true", label: "Chat Enabled", hint: "\"false\" to disable messaging" },
    { key: "signup_enabled", value: "true", label: "Signup Enabled", hint: "\"false\" to lock new registrations" },
    { key: "home_banner_text", value: "", label: "Home Banner Text", hint: "Short promo text on home page" },
    { key: "popup_message", value: "", label: "Popup Message", hint: "One-time popup shown on load" },
    { key: "signup_ranks", value: "Diamond,Heroic,Master", label: "Signup Ranks", hint: "Comma-separated rank options (e.g., Diamond,Heroic,Master)" },
    { key: "signup_roles", value: "Rusher,Support,Bomber,Sniper", label: "Signup Roles", hint: "Comma-separated role options (e.g., Rusher,Support,Bomber,Sniper)" },
];

const AdminSettings = () => {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const { adsEnabled, loading: adsLoading, updateAdsEnabled } = useAdSettings();
    const [togglingAds, setTogglingAds] = useState(false);

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from("app_settings").select("key, value");
        const map: Record<string, string> = {};
        (data || []).forEach((r: any) => { map[r.key] = r.value; });
        // Fill defaults for any missing
        defaultSettings.forEach((d) => { if (!(d.key in map)) map[d.key] = d.value; });
        setSettings(map);
        setLoaded(true);
    };

    const seedDefaults = async () => {
        setSeeding(true);
        for (const { key, value } of defaultSettings) {
            await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });
        }
        toast.success("Default settings seeded!");
        fetchSettings();
        setSeeding(false);
    };

    const save = async () => {
        setSaving(true);
        const ops = Object.entries(settings).map(([key, value]) =>
            supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" })
        );
        await Promise.all(ops);
        toast.success("Settings saved ✅");
        setSaving(false);
    };

    const handleToggleAds = async () => {
        setTogglingAds(true);
        const success = await updateAdsEnabled(adsEnabled ? false : true);
        if (success) {
            toast.success(`Ads ${adsEnabled ? "disabled" : "enabled"} 📺`);
        } else {
            toast.error("Failed to update ad setting");
        }
        setTogglingAds(false);
    };

    return (
        <div className="space-y-5 max-w-xl">
            {/* Global Ad Control */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Volume className="w-4 h-4 text-red-500" /> Global Ad Control
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Turn ads on/off for all users</p>
                    </div>
                    <button
                        onClick={handleToggleAds}
                        disabled={adsLoading || togglingAds}
                        className={`relative w-11 h-6 rounded-full transition-all ${adsEnabled ? "bg-red-500" : "bg-[#2a2a2a]"}`}
                    >
                        <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${adsEnabled ? "right-0.5" : "left-0.5"}`}
                        />
                    </button>
                </div>
                <p className="text-[11px] text-gray-600 mt-3">
                    Status: <span className={adsEnabled ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                        {adsLoading ? "Loading..." : adsEnabled ? "🟢 Ads Enabled" : "🔴 Ads Disabled"}
                    </span>
                </p>
            </div>

            <div className="flex items-center gap-3">
                <div>
                    <h2 className="text-base font-bold text-white">App Settings</h2>
                    <p className="text-xs text-gray-500 mt-0.5">All changes reflect live in app instantly.</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <button onClick={seedDefaults} disabled={seeding}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-400 bg-[#1a1a1a] hover:bg-[#222] transition-colors disabled:opacity-40">
                        <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
                        Seed Defaults
                    </button>
                    <button onClick={save} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
                        style={{ background: "linear-gradient(135deg, hsl(0,85%,38%), hsl(0,85%,50%))" }}>
                        <Save className="w-3.5 h-3.5" />
                        {saving ? "Saving..." : "Save All"}
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] divide-y divide-[#141414] overflow-hidden">
                {defaultSettings.map(({ key, label, hint }) => (
                    <div key={key} className="flex items-start gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{label}</p>
                            <p className="text-[11px] text-gray-600 mt-0.5">{hint}</p>
                            <p className="text-[10px] text-gray-700 font-mono mt-0.5">key: {key}</p>
                        </div>
                        <input
                            type="text"
                            value={loaded ? (settings[key] ?? "") : ""}
                            onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                            className="bg-[#111] border border-[#222] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/40 transition-colors w-48 flex-shrink-0"
                            placeholder="value..."
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminSettings;
