import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone } from "lucide-react";

const AnnouncementPopup = () => {
    const [announcement, setAnnouncement] = useState<{ id: string; title: string; message: string } | null>(null);

    useEffect(() => {
        fetchActive();
    }, []);

    const fetchActive = async () => {
        const { data } = await supabase
            .from("announcements")
            .select("id, title, message")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) {
            const key = `rz_ann_seen_${data.id}`;
            if (!sessionStorage.getItem(key)) {
                setAnnouncement(data);
            }
        }
    };

    const dismiss = () => {
        if (announcement) {
            sessionStorage.setItem(`rz_ann_seen_${announcement.id}`, "1");
        }
        setAnnouncement(null);
    };

    if (!announcement) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-sm rounded-2xl p-5 border border-primary/20 relative animate-in zoom-in-95 duration-200"
                style={{ background: "linear-gradient(145deg, hsl(0,0%,9%), hsl(0,0%,7%))", boxShadow: "0 0 40px hsla(0,85%,50%,0.15)" }}
            >
                <button
                    onClick={dismiss}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Announcement</span>
                </div>

                <h3 className="gaming-title text-base text-foreground mb-2">{announcement.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{announcement.message}</p>

                <button
                    onClick={dismiss}
                    className="w-full mt-4 py-2.5 btn-gaming rounded-xl text-sm"
                >
                    Got it 🔥
                </button>
            </div>
        </div>
    );
};

export default AnnouncementPopup;
