import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, Globe, Swords, Trophy, ArrowLeft, Check, X, Image, MessageCircle, Search, ChevronDown, Users, Flame, Wifi } from "lucide-react";
import { toast } from "sonner";
import AdBanner from "@/components/AdBanner";
import InterstitialAd from "@/components/InterstitialAd";
import { useNavigate } from "react-router-dom";

interface SquadsProps {
  currentUserId: string;
}

interface Squad {
  id: string;
  squad_name: string;
  squad_username?: string;
  team_level?: string;
  language: string;
  play_time: string;
  description: string;
  created_by: string;
  squad_logo: string | null;
  created_at?: string;
}

interface SquadMember {
  id: string;
  user_id: string;
  role_in_squad: string;
  created_at: string;
  user?: { id: string; nickname: string; rank?: string; role?: string };
}

const RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Heroic"];
const ROLES = ["Rusher", "Sniper", "Support", "Any"];
const LANGUAGES = ["Bangla", "English", "Hindi"];
const TEAM_LEVELS = ["T1", "T2", "T3"];

type View = "allSquads" | "mySquads" | "create" | "edit";

type FilterKey = "rank" | "role" | "language";

interface Filters {
  rank: string;
  role: string;
  language: string;
}

const FILTER_OPTIONS: Record<FilterKey, string[]> = {
  rank: ["All", ...RANKS],
  role: ["All", ...ROLES],
  language: ["All", ...LANGUAGES],
};

const FILTER_LABELS: Record<FilterKey, string> = {
  rank: "Rank",
  role: "Role Needed",
  language: "Language",
};

const Squads = ({ currentUserId }: SquadsProps) => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("allSquads");
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAd, setShowAd] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [adsEnabled, setAdsEnabled] = useState(true);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({ rank: "All", role: "All", language: "All" });
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);

  // Create form state
  const [squadName, setSquadName] = useState("");
  const [teamLevel, setTeamLevel] = useState("");
  const [language, setLanguage] = useState("English");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Your Squad view
  const [userSquad, setUserSquad] = useState<Squad | null>(null);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);
  const [squadAchievements, setSquadAchievements] = useState<any[]>([]);
  const [showAchievementForm, setShowAchievementForm] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementDesc, setAchievementDesc] = useState("");
  
  // Squad member counts for display
  const [squadMemberCounts, setSquadMemberCounts] = useState<Map<string, number>>(new Map());

  
  useEffect(() => {
    // Initialize data on mount and when user changes
    const init = async () => {
      await fetchSquads();
      await fetchUserSquad();
      await fetchAdSettings();
    };
    init().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const fetchAdSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ads_enabled")
        .single();

      if (error) {
        console.error("Error fetching ad settings:", error);
        setAdsEnabled(true); // Default to true if fetch fails
        return;
      }

      // Convert value to boolean
      let isEnabled = true;
      const value = data?.value;
      if (typeof value === "boolean") {
        isEnabled = value;
      } else if (typeof value === "string") {
        isEnabled = value.toLowerCase() === "true";
      } else if (typeof value === "object" && value !== null) {
        isEnabled = Boolean(value);
      }

      setAdsEnabled(isEnabled);
    } catch (err) {
      console.error("Error in fetchAdSettings:", err);
      setAdsEnabled(true); // Default to true on error
    }
  };

  const fetchSquads = async () => {
    const { data } = await supabase
      .from("squads")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setSquads(data as Squad[]);
      
      // Fetch member counts for each squad
      const counts = new Map<string, number>();
      for (const squad of data) {
        const { count } = await supabase
          .from("squad_members")
          .select("id", { count: "exact", head: true })
          .eq("squad_id", squad.id);
        counts.set(squad.id, count || 0);
      }
      setSquadMemberCounts(counts);
    }
    setLoading(false);
  };

  const fetchUserSquad = async () => {
    try {
      // Check if user is a member of any squad
      const { data: memberData, error: memberError } = await supabase
        .from("squad_members")
        .select("squad_id")
        .eq("user_id", currentUserId);
      
      if (memberError || !memberData || memberData.length === 0) {
        setUserSquad(null);
        setSquadMembers([]);
        return;
      }
      
      // User is a member of a squad, fetch squad details
      const { data: squadData, error: squadError } = await supabase
        .from("squads")
        .select("*")
        .eq("id", memberData[0].squad_id)
        .single();
      
      if (squadError || !squadData) {
        setUserSquad(null);
        return;
      }
      
      setUserSquad(squadData as Squad);
        
      // Fetch squad members
      const { data: membersData } = await supabase
        .from("squad_members")
        .select("id, user_id, role_in_squad, created_at")
        .eq("squad_id", memberData[0].squad_id);
        
      if (membersData) {
        const userIds = membersData.map((m) => m.user_id);
        const { data: usersData } = await supabase
          .from("users")
          .select("id, nickname, rank, role")
          .in("id", userIds);
          
        const userMap = new Map(usersData?.map((u) => [u.id, u]) || []);
        setSquadMembers(
          membersData.map((m) => ({
            ...m,
            user: userMap.get(m.user_id) || { id: m.user_id, nickname: "Unknown" },
          }))
        );
      }

      // Fetch squad achievements
      const { data: achievementsData } = await supabase
        .from("squad_achievements")
        .select("*")
        .eq("squad_id", memberData[0].squad_id)
        .order("created_at", { ascending: false });
      
      if (achievementsData) {
        setSquadAchievements(achievementsData);
      }
    } catch (error) {
      console.error("Error fetching user squad:", error);
      setUserSquad(null);
      setSquadMembers([]);
      setSquadAchievements([]);
    }
  };

  const showAdThen = (action: () => void) => {
    // If ads are disabled, skip directly to the action
    if (!adsEnabled) {
      action();
      return;
    }
    // Otherwise, show the ad first
    setPendingAction(() => action);
    setShowAd(true);
  };

  const handleAdClose = () => {
    setShowAd(false);
    pendingAction?.();
    setPendingAction(null);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    const ext = logoFile.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("squad-logos").upload(path, logoFile);
    if (error) {
      toast.error("Failed to upload logo");
      return null;
    }
    const { data } = supabase.storage.from("squad-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  // Validation: Check if username is already taken
  // Validation: Check if user is already in a squad (one squad rule)
  const checkUserNotAlreadyInSquad = async (): Promise<boolean> => {
    if (!currentUserId) return false;
    
    // Check if user is already a member of any squad
    const { data: memberData } = await supabase
      .from("squad_members")
      .select("squad_id")
      .eq("user_id", currentUserId)
      .limit(1);
    
    if (memberData && memberData.length > 0) {
      toast.error("You are already a member or creator of a squad.");
      return false;
    }
    
    return true;
  };

  const createSquad = async () => {
    if (!squadName.trim()) {
      toast.error("Enter a squad name");
      return;
    }
    
    setCreating(true);
    
    try {
      // Check one-squad rule
      const canCreate = await checkUserNotAlreadyInSquad();
      if (!canCreate) {
        setCreating(false);
        return;
      }
      
      const logoUrl = await uploadLogo();
      const { data: newSquad, error } = await supabase.from("squads").insert({
        squad_name: squadName.trim(),
        language,
        team_level: teamLevel,
        play_time: "Anytime",
        description: description.trim(),
        created_by: currentUserId,
        squad_logo: logoUrl,
      }).select("id").single();
      
      if (!error && newSquad) {
        await supabase.from("squad_members").insert({
          squad_id: newSquad.id,
          user_id: currentUserId,
          role_in_squad: "leader",
        });
        toast.success("Squad created! 🔥");
        setSquadName("");
        setTeamLevel("T1");
        setDescription("");
        setLogoFile(null);
        setLogoPreview(null);
        fetchSquads();
        await fetchUserSquad();
        setView("mySquads");
      } else {
        toast.error("Failed to create squad");
      }
    } catch (err) {
      console.error("Error creating squad:", err);
      toast.error("An error occurred while creating the squad");
    } finally {
      setCreating(false);
    }
  };

  // Update squad (creator only)
  const updateSquad = async () => {
    if (!userSquad || userSquad.created_by !== currentUserId) {
      toast.error("Only the creator can edit this squad");
      return;
    }
    
    if (!squadName.trim()) {
      toast.error("Enter a squad name");
      return;
    }
    
    setCreating(true);
    
    try {
      let logoUrl = userSquad.squad_logo;
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          throw new Error("Logo upload failed");
        }
      }
      
      const { error } = await supabase
        .from("squads")
        .update({
          squad_name: squadName.trim(),
          team_level: teamLevel,
          language,
          description: description.trim(),
          squad_logo: logoUrl,
        })
        .eq("id", userSquad.id);
      
      if (error) throw error;
      
      toast.success("Squad updated! ✨");
      setLogoFile(null);
      setLogoPreview(null);
      await fetchUserSquad();
      setIsEditMode(false);
      setView("mySquads");
    } catch (err) {
      console.error("Error updating squad:", err);
      toast.error("Failed to update squad");
    } finally {
      setCreating(false);
    }
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setLogoFile(null);
    setLogoPreview(null);
    if (userSquad) {
      setSquadName(userSquad.squad_name);
      setTeamLevel(userSquad.team_level || "");
      setLanguage(userSquad.language);
      setDescription(userSquad.description);
    }
  };

  const deleteSquad = async () => {
    if (!userSquad || userSquad.created_by !== currentUserId) {
      toast.error("Only the creator can delete this squad");
      return;
    }

    if (!confirm("Are you sure you want to delete this squad? This action cannot be undone.")) {
      return;
    }

    setCreating(true);

    try {
      // Delete squad members
      await supabase.from("squad_members").delete().eq("squad_id", userSquad.id);

      // Delete squad join requests
      await supabase.from("squad_join_requests").delete().eq("squad_id", userSquad.id);

      // Delete the squad
      const { error } = await supabase.from("squads").delete().eq("id", userSquad.id);

      if (error) throw error;

      toast.success("Squad deleted successfully");
      setUserSquad(null);
      setView("allSquads");
      await fetchSquads();
    } catch (err) {
      console.error("Error deleting squad:", err);
      toast.error("Failed to delete squad");
    } finally {
      setCreating(false);
    }
  };

  const addAchievement = async () => {
    if (!userSquad || userSquad.created_by !== currentUserId) {
      toast.error("Only the squad creator can add achievements");
      return;
    }

    if (!achievementTitle.trim()) {
      toast.error("Achievement title is required");
      return;
    }

    try {
      const { error } = await supabase.from("squad_achievements").insert({
        squad_id: userSquad.id,
        title: achievementTitle.trim(),
        description: achievementDesc.trim() || null,
      });

      if (!error) {
        toast.success("Achievement added! 🏆");
        setAchievementTitle("");
        setAchievementDesc("");
        setShowAchievementForm(false);
        await fetchUserSquad();
      } else {
        toast.error("Failed to add achievement");
      }
    } catch (err) {
      console.error("Error adding achievement:", err);
      toast.error("An error occurred");
    }
  };

  const deleteAchievement = async (achievementId: string) => {
    if (!userSquad || userSquad.created_by !== currentUserId) {
      toast.error("Only the squad creator can delete achievements");
      return;
    }

    try {
      const { error } = await supabase.from("squad_achievements").delete().eq("id", achievementId);

      if (!error) {
        toast.success("Achievement removed");
        await fetchUserSquad();
      } else {
        toast.error("Failed to delete achievement");
      }
    } catch (err) {
      console.error("Error deleting achievement:", err);
      toast.error("An error occurred");
    }
  };

  const startEdit = () => {
    if (userSquad) {
      setSquadName(userSquad.squad_name);
      setTeamLevel(userSquad.team_level || "");
      setLanguage(userSquad.language);
      setDescription(userSquad.description);
      setIsEditMode(true);
    }
  };

  // Filtered squads (exclude user's own squad if they're a member)
  const filteredSquads = squads.filter((s) => {
    if (userSquad && s.id === userSquad.id) return false; // Hide their own squad
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.squad_name.toLowerCase().includes(q) ||
      s.language.toLowerCase().includes(q);
    const matchesLang = filters.language === "All" || s.language === filters.language;
    return matchesSearch && matchesLang;
  });

  // Get user's squads (created by current user)
  const mySquads = squads.filter((s) => s.created_by === currentUserId);

  // Stats
  const totalSquads = squads.length;
  const eliteSquads = squads.filter((s) => s.team_level === "T3").length;
  const now = Date.now();
  const activeSquads = squads.filter((s) => {
    if (!s.created_at) return false;
    return now - new Date(s.created_at).getTime() < 24 * 60 * 60 * 1000;
  }).length;

  // CREATE VIEW
  if (view === "create") {
    return (
      <div className="min-h-screen bg-background pb-20">
        {showAd && <InterstitialAd onClose={handleAdClose} />}
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("allSquads")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="gaming-title text-base text-foreground">Create Squad</h1>
          </div>
        </div>
        <div className="px-4 py-4 space-y-4">
          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Squad Logo</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-28 bg-secondary border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors overflow-hidden"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Image className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tap to upload logo</span>
                </>
              )}
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Squad Name</label>
            <input
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="Enter squad name"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <DropdownField label="Team Level" value={teamLevel} options={TEAM_LEVELS} onChange={setTeamLevel} placeholder="Select team level" />
          <DropdownField label="Language" value={language} options={LANGUAGES} onChange={setLanguage} />
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your squad..."
              rows={3}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
          <button
            onClick={() => showAdThen(createSquad)}
            disabled={creating}
            className="w-full py-3 text-sm font-semibold rounded-xl text-primary-foreground disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, hsl(0,60%,30%), hsl(0,85%,50%))" }}
          >
            {creating ? "Creating..." : "Create Squad"}
          </button>
        </div>
      </div>
    );
  }

  // EDIT VIEW
  if (view === "edit" && userSquad && isEditMode && userSquad.created_by === currentUserId) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {showAd && <InterstitialAd onClose={handleAdClose} />}
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={cancelEdit} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="gaming-title text-base text-foreground">Edit Squad</h1>
          </div>
        </div>
        <div className="px-4 py-4 space-y-4">
          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Squad Logo</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-28 bg-secondary border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors overflow-hidden"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
              ) : userSquad.squad_logo ? (
                <img src={userSquad.squad_logo} alt="Current logo" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Image className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tap to change logo</span>
                </>
              )}
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Squad Name</label>
            <input
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="Enter squad name"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <DropdownField label="Team Level" value={teamLevel} options={TEAM_LEVELS} onChange={setTeamLevel} placeholder="Select team level" />
          <DropdownField label="Language" value={language} options={LANGUAGES} onChange={setLanguage} />
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your squad..."
              rows={3}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={cancelEdit}
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => showAdThen(updateSquad)}
              disabled={creating}
              className="flex-1 py-3 text-sm font-semibold rounded-xl text-primary-foreground disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, hsl(0,60%,30%), hsl(0,85%,50%))" }}
            >
              {creating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // YOUR SQUAD VIEW
  if (view === "mySquads" && userSquad) {
    const isCreator = userSquad.created_by === currentUserId;
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("allSquads")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="gaming-title text-base text-foreground">Your Squad</h1>
          </div>
        </div>
        <div className="px-4 py-4 space-y-4">
          {/* Squad Header */}
          <div className="rounded-2xl p-4 space-y-3 border border-primary/10"
            style={{
              background: "hsl(0,0%,10%)",
              boxShadow: "0 2px 16px hsl(0,85%,50%,0.06), 0 0 0 1px hsl(0,85%,50%,0.08)",
            }}>
            <div className="flex items-center gap-3">
              {userSquad.squad_logo ? (
                <img
                  src={userSquad.squad_logo}
                  alt={userSquad.squad_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <h2 className="gaming-title text-lg text-foreground">{userSquad.squad_name}</h2>
                <p className="text-xs text-muted-foreground">
                  @{userSquad.squad_username} • {isCreator ? "You" : "Squad Creator"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <Trophy className="w-2.5 h-2.5" /> {userSquad.team_level || "T1"}
              </span>
              <span className="inline-flex items-center gap-1 bg-secondary text-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                <Globe className="w-2.5 h-2.5" /> {userSquad.language}
              </span>
            </div>
            {userSquad.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{userSquad.description}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => navigate(`/chat?user=${userSquad.created_by}`)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-all flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Trial Zone
              </button>
              {isCreator && (
                <button
                  onClick={startEdit}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                >
                  ✏️ Edit
                </button>
              )}
            </div>
            <div className="mt-2 p-2 bg-secondary rounded-lg flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Squad Capacity</span>
              <span className="text-sm font-bold text-foreground">{squadMembers.length}/5</span>
            </div>
          </div>

          {/* Squad Members */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              Squad Members ({squadMembers.length})
            </h3>
            <div className="space-y-2">
              {squadMembers.map((member) => (
                <div key={member.id} className="card-gaming p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{member.user?.nickname}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.user?.rank} • {member.user?.role}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                      {member.role_in_squad === "leader" ? "Squad Creator" : "Member"}
                    </p>
                  </div>
                  {isCreator && member.user_id !== currentUserId && (
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from("squad_members")
                          .delete()
                          .eq("id", member.id);
                        if (!error) {
                          toast.success("Member removed");
                          fetchUserSquad();
                        }
                      }}
                      className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Squad Achievements */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-primary" />
                Achievements
              </h3>
              {isCreator && (
                <button
                  onClick={() => setShowAchievementForm(!showAchievementForm)}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {showAchievementForm ? "Cancel" : "Add"}
                </button>
              )}
            </div>

            {showAchievementForm && isCreator && (
              <div className="bg-secondary rounded-lg p-3 mb-3 space-y-2 border border-border">
                <input
                  type="text"
                  placeholder="Achievement title"
                  value={achievementTitle}
                  onChange={(e) => setAchievementTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={achievementDesc}
                  onChange={(e) => setAchievementDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  rows={2}
                />
                <button
                  onClick={addAchievement}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  Add Achievement
                </button>
              </div>
            )}

            {squadAchievements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No achievements yet</p>
            ) : (
              <div className="space-y-2">
                {squadAchievements.map((achievement) => (
                  <div key={achievement.id} className="card-gaming p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{achievement.title}</p>
                        {achievement.description && (
                          <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                        )}
                      </div>
                      {isCreator && (
                        <button
                          onClick={() => deleteAchievement(achievement.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors ml-2 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW (All Squads & My Squads)
  const displaySquads = view === "mySquads" ? mySquads : filteredSquads;
  
  return (
    <div className="min-h-screen bg-background pb-20">
      {showAd && <InterstitialAd onClose={handleAdClose} />}

      {/* Filter dropdown modal */}
      {activeFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setActiveFilter(null)}>
          <div
            className="w-full max-w-md bg-card border-t border-border rounded-t-2xl p-4 pb-8 space-y-2 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="gaming-title text-sm text-foreground text-center mb-3">{FILTER_LABELS[activeFilter]}</p>
            {FILTER_OPTIONS[activeFilter].map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setFilters((f) => ({ ...f, [activeFilter]: opt }));
                  setActiveFilter(null);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${filters[activeFilter] === opt
                    ? "bg-primary/20 text-primary font-semibold"
                    : "text-foreground hover:bg-secondary"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="gaming-title text-base text-foreground">Squads</h1>
          </div>
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary-foreground rounded-xl transition-all hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(0,60%,30%), hsl(0,85%,50%))" }}
          >
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search squad name..."
            className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

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
          <StatCard icon={<Users className="w-4 h-4 text-primary" />} label="Total" value={totalSquads} />
          <StatCard icon={<Flame className="w-4 h-4 text-primary" />} label="Elite" value={eliteSquads} />
          <StatCard icon={<Wifi className="w-4 h-4 text-primary" />} label="Active" value={activeSquads} />
        </div>

        {/* Squad View Tabs */}
        <div className="flex gap-2 p-1.5 rounded-xl bg-secondary/50 backdrop-blur-sm border border-border/50">
          <button
            onClick={() => setView("allSquads")}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all relative ${
              view === "allSquads"
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={
              view === "allSquads"
                ? {
                    background: "linear-gradient(135deg, hsl(0,85%,38%), hsl(0,85%,50%))",
                    boxShadow: "0 0 12px hsl(0,85%,50%,0.3)",
                  }
                : undefined
            }
          >
            All Squads
          </button>
          <button
            onClick={() => setView("mySquads")}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all relative flex items-center justify-center gap-1.5 ${
              view === "mySquads"
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={
              view === "mySquads"
                ? {
                    background: "linear-gradient(135deg, hsl(0,85%,38%), hsl(0,85%,50%))",
                    boxShadow: "0 0 12px hsl(0,85%,50%,0.3)",
                  }
                : undefined
            }
          >
            <Shield className="w-3.5 h-3.5" />
            My Squads
            {userSquad && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Global Ad Banner - conditionally rendered based on admin setting */}
        {adsEnabled && <AdBanner />}

        {/* Squad List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displaySquads.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm">{view === "mySquads" ? "You haven't created any squads yet" : "No squads found"}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {displaySquads.map((squad) => {
              const isOwner = squad.created_by === currentUserId;
              return (
                <div
                  key={squad.id}
                  className="rounded-2xl p-4 space-y-3 border border-primary/10 bg-card shadow-card-gaming"
                >
                  <div className="flex items-center gap-3">
                    {/* Circle logo */}
                    {squad.squad_logo ? (
                      <img
                        src={squad.squad_logo}
                        alt={squad.squad_name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/30">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="gaming-title text-sm text-foreground truncate">{squad.squad_name}</h3>
                        {isOwner && (
                          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            Leader
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      <Trophy className="w-2.5 h-2.5" /> {squad.team_level || "T1"}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-secondary text-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                      <Globe className="w-2.5 h-2.5" /> {squad.language}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-secondary text-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                      <Users className="w-2.5 h-2.5" /> {squadMemberCounts.get(squad.id) || 0}/5
                    </span>
                    {squadMemberCounts.get(squad.id) === 5 && (
                      <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Full
                      </span>
                    )}
                  </div>

                  {squad.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{squad.description}</p>
                  )}

                  {/* Action buttons */}
                  {view === "mySquads" ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setUserSquad(squad);
                          setSquadName(squad.squad_name);
                          setTeamLevel(squad.team_level || "");
                          setLanguage(squad.language);
                          setDescription(squad.description);
                          setIsEditMode(true);
                          setView("edit");
                        }}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => {
                          setUserSquad(squad);
                          deleteSquad();
                        }}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => navigate(`/chat?user=${squad.created_by}`)}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Trial Zone
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="bg-secondary/60 border border-border rounded-xl px-3 py-2.5 flex items-center gap-2">
    {icon}
    <div>
      <p className="text-base font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  </div>
);

const DropdownField = ({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="text-[10px] text-muted-foreground/80 font-semibold uppercase tracking-tight">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-secondary/70 border border-border/60 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all appearance-none cursor-pointer hover:bg-secondary hover:border-border/80"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  </div>
);

export default Squads;
