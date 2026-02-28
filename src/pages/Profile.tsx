import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut, Crosshair, Clock, Globe, Star, Sun, Moon, Camera, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import type { CurrentUser } from "@/hooks/useCurrentUser";

interface ProfileProps {
  currentUserId: string | null;
  onLogout: () => void;
}

const Profile = ({ currentUserId, onLogout }: ProfileProps) => {
  const [user, setUser] = useState<CurrentUser & { profile_picture_url?: string; } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({
    rank: "",
    role: "",
    kd_ratio: "",
    play_time: "",
    language: "",
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (currentUserId) fetchUser();
  }, [currentUserId]);

  const fetchUser = async () => {
    const { data, error } = await supabase.from("users").select("*").eq("id", currentUserId!).single();
    if (error) {
      console.error("Profile fetch error:", error);
      toast.error("Failed to load profile");
    }
    if (data) {
      const userData = data as CurrentUser & { profile_picture_url?: string; squad_name?: string };
      
      // Fetch squad info if user is a squad member/creator
      const { data: squadMember } = await supabase
        .from("squad_members")
        .select("squad_id")
        .eq("user_id", currentUserId!)
        .single();
      
      if (squadMember) {
        const { data: squad } = await supabase
          .from("squads")
          .select("squad_name")
          .eq("id", squadMember.squad_id)
          .single();
        
        if (squad) {
          userData.squad_name = squad.squad_name;
        }
      }
      
      setUser(userData);
      setPfpPreview(userData.profile_picture_url || null);
      setEditData({
        rank: userData.rank || "",
        role: userData.role || "",
        kd_ratio: userData.kd_ratio || "",
        play_time: userData.play_time || "",
        language: userData.language || "",
      });
    }
    setLoading(false);
  };

  const toggleEditMode = () => {
    if (isEditMode && user) {
      // Reset edit data when canceling
      setEditData({
        rank: user.rank || "",
        role: user.role || "",
        kd_ratio: user.kd_ratio || "",
        play_time: user.play_time || "",
        language: user.language || "",
      });
    }
    setIsEditMode(!isEditMode);
  };

  const saveChanges = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update(editData)
        .eq("id", user.id);

      if (error) throw error;

      setUser({ ...user, ...editData });
      setIsEditMode(false);
      toast.success("Profile updated! ✅");
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePfpSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    
    setPfpPreview(URL.createObjectURL(file));
    uploadPfp(file);
  };

  const uploadPfp = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}-pfp-${Date.now()}.${ext}`;
      
      // Delete old PFP if exists
      if (user.profile_picture_url) {
        try {
          const oldPath = user.profile_picture_url.split("/").pop();
          if (oldPath) {
            await supabase.storage.from("profile-pictures").remove([oldPath]);
          }
        } catch (error) {
          console.log("Could not delete old profile picture");
        }
      }

      // Upload new PFP
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(path, file, { upsert: false });
        
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload image to storage");
      }

      if (!uploadData) {
        throw new Error("No upload data returned");
      }

      // Get public URL
      const { data: publicUrl } = supabase.storage.from("profile-pictures").getPublicUrl(path);
      
      if (!publicUrl || !publicUrl.publicUrl) {
        throw new Error("Could not get public URL");
      }

      const imageUrl = publicUrl.publicUrl;

      // Update user profile in database
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_picture_url: imageUrl })
        .eq("id", user.id);
        
      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("Failed to update profile");
      }

      // Update local state
      setUser({ ...user, profile_picture_url: imageUrl });
      setPfpPreview(imageUrl);
      toast.success("Profile picture updated! 🎮");
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to upload profile picture";
      toast.error(errorMsg);
      // Revert preview on error
      setPfpPreview(user?.profile_picture_url || null);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h1 className="gaming-title text-base text-foreground">Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
            {!isEditMode && (
              <button
                onClick={toggleEditMode}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
                title="Edit profile"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onLogout} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Avatar & PFP Upload */}
        <div className="text-center space-y-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto overflow-hidden border-2 border-primary/30">
              {pfpPreview ? (
                <img src={pfpPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-gaming text-4xl font-bold">{user.nickname[0].toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePfpSelect} className="hidden" />
          </div>
          <h2 className="font-gaming text-xl text-foreground">{user.nickname}</h2>
          <p className="text-xs text-muted-foreground font-mono">UID: {user.uid}</p>
          {uploading && <p className="text-xs text-primary">Uploading...</p>}
          {user.squad_name && (
            <p className="text-xs text-primary font-semibold">🎮 {user.squad_name}</p>
          )}
        </div>

        {/* Stats */}
        {!isEditMode ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Star className="w-4 h-4 text-primary" />} label="Rank" value={user.rank} />
            <StatCard icon={<Crosshair className="w-4 h-4 text-primary" />} label="Role" value={user.role} />
            <StatCard icon={<span className="text-xs font-mono text-primary font-bold">K/D</span>} label="K/D Ratio" value={user.kd_ratio} />
            <StatCard icon={<Clock className="w-4 h-4 text-primary" />} label="Play Time" value={user.play_time} />
            <StatCard icon={<Globe className="w-4 h-4 text-primary" />} label="Language" value={user.language} />
          </div>
        ) : (
          <div className="space-y-3 card-gaming p-4">
            <h3 className="gaming-title text-sm text-foreground mb-3">Edit Profile</h3>
            
            {/* Rank */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Rank</label>
              <input
                type="text"
                value={editData.rank}
                onChange={(e) => setEditData({ ...editData, rank: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="e.g., Diamond"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Role</label>
              <input
                type="text"
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="e.g., Rusher"
              />
            </div>

            {/* K/D Ratio */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">K/D Ratio</label>
              <input
                type="text"
                value={editData.kd_ratio}
                onChange={(e) => setEditData({ ...editData, kd_ratio: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="e.g., 2.5"
              />
            </div>

            {/* Play Time */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Play Time</label>
              <input
                type="text"
                value={editData.play_time}
                onChange={(e) => setEditData({ ...editData, play_time: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="e.g., Anytime"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Language</label>
              <input
                type="text"
                value={editData.language}
                onChange={(e) => setEditData({ ...editData, language: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="e.g., English"
              />
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex gap-3 mt-4 pt-3 border-t border-border">
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-semibold text-sm"
              >
                <Check className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={toggleEditMode}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 font-semibold text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="mt-6 pt-4 border-t border-border">
          <h3 className="gaming-title text-sm text-foreground mb-3">Settings</h3>
          <div className="card-gaming p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-primary" />
              ) : (
                <Moon className="w-5 h-5 text-primary" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">Theme</p>
                <p className="text-xs text-muted-foreground capitalize">{theme} mode</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
            >
              Toggle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="card-gaming p-3 flex items-center gap-2.5">
    {icon}
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

export default Profile;
