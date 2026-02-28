import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const AdminAnnouncements = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ id: "", title: "", message: "", is_active: false });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
        setItems(data || []);
        setLoading(false);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) return;
        setSaving(true);
        if (editing && form.id) {
            await supabase.from("announcements").update({ title: form.title, message: form.message, is_active: form.is_active }).eq("id", form.id);
            toast.success("Updated!");
        } else {
            await supabase.from("announcements").insert({ title: form.title, message: form.message, is_active: form.is_active });
            toast.success("Announcement created!");
        }
        setForm({ id: "", title: "", message: "", is_active: false });
        setEditing(false);
        fetchAll();
        setSaving(false);
    };

    const toggleActive = async (id: string, val: boolean) => {
        await supabase.from("announcements").update({ is_active: !val }).eq("id", id);
        fetchAll();
    };

    const deleteItem = async (id: string) => {
        if (!confirm("Delete this announcement?")) return;
        await supabase.from("announcements").delete().eq("id", id);
        toast.success("Deleted.");
        fetchAll();
    };

    const startEdit = (item: any) => {
        setForm({ id: item.id, title: item.title, message: item.message, is_active: item.is_active });
        setEditing(true);
    };

    return (
        <div className="space-y-5">
            {/* Form */}
            <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-red-500" />
                    {editing ? "Edit Announcement" : "New Announcement"}
                </h3>
                <form onSubmit={save} className="space-y-3">
                    <input
                        type="text" placeholder="Title" value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                    />
                    <textarea
                        placeholder="Message..." value={form.message} rows={3}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 transition-colors resize-none"
                    />
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-400">
                            <div
                                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                                className={`w-9 h-5 rounded-full transition-colors relative ${form.is_active ? "bg-red-500" : "bg-[#2a2a2a]"}`}
                            >
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? "left-4" : "left-0.5"}`} />
                            </div>
                            Active (show in app)
                        </label>
                        <div className="flex gap-2 ml-auto">
                            {editing && (
                                <button type="button" onClick={() => { setEditing(false); setForm({ id: "", title: "", message: "", is_active: false }); }}
                                    className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white bg-[#1a1a1a] transition-colors">Cancel</button>
                            )}
                            <button type="submit" disabled={saving}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
                                style={{ background: "linear-gradient(135deg, hsl(0,85%,38%), hsl(0,85%,50%))" }}>
                                {saving ? "Saving..." : editing ? "Update" : "Publish"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />
                    ))
                ) : items.length === 0 ? (
                    <p className="text-center text-gray-600 text-sm py-8">No announcements yet</p>
                ) : items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-3.5 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-bold text-white truncate">{item.title}</p>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.is_active ? "text-green-400 bg-green-500/10" : "text-gray-500 bg-gray-500/10"}`}>
                                    {item.is_active ? "LIVE" : "DRAFT"}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">{item.message}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={() => toggleActive(item.id, item.is_active)}
                                className={`p-1.5 rounded-lg transition-colors ${item.is_active ? "text-green-400 bg-green-500/10 hover:bg-green-500/20" : "text-gray-500 hover:text-green-400 hover:bg-green-500/10"}`}>
                                {item.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => startEdit(item)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteItem(item.id)}
                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminAnnouncements;
