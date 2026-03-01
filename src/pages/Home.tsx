import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Share2, Image as ImageIcon, X, Gamepad2, Trash2, MoreVertical, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import AdBanner from "@/components/AdBanner";
import { useNavigate } from "react-router-dom";

interface HomeProps {
  currentUserId: string;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user?: { id: string; nickname: string; profile_picture_url?: string };
  isLikedByMe?: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  user?: { id: string; nickname: string; profile_picture_url?: string };
  replies?: Comment[];
}

const Home = ({ currentUserId }: HomeProps) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [commentUsers, setCommentUsers] = useState<Record<string, any>>({});
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await (supabase as any).from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        // Fetch user details for each post
        const userIds = [...new Set((data as unknown[]).map((p: unknown) => (p as Record<string, unknown>).user_id))] as string[];
        const { data: users } = await supabase
          .from("users")
          .select("id, nickname, profile_picture_url")
          .in("id", userIds);
        const userMap = new Map((users as unknown[] | null)?.map((u: unknown) => [(u as Record<string, unknown>).id, u]) || []);

        // Check which posts are liked by current user
        const { data: likedPosts } = await (supabase as any).from("post_likes")
          .select("post_id")
          .eq("user_id", currentUserId);
        const likedPostIds = new Set((likedPosts as unknown[] | null)?.map((l: unknown) => (l as Record<string, unknown>).post_id) || []);

        const enrichedPosts = (data as unknown[]).map((p: unknown) => ({
          ...(p as Post),
          user: userMap.get((p as Record<string, unknown>).user_id as string),
          isLikedByMe: likedPostIds.has((p as Record<string, unknown>).id as string),
        }));

        setPosts(enrichedPosts as Post[]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setLoading(false);
    }
  }, [currentUserId]);

  const subscribeToPosts = useCallback(() => {
    const subscription = supabase
      .channel("feed-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          // Refetch all posts when post content changes
          fetchPosts();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_likes" },
        (payload: any) => {
          // Update specific post when liked
          setPosts((prevPosts) =>
            prevPosts.map((p) =>
              p.id === payload.new.post_id
                ? { ...p, likes_count: p.likes_count + 1 }
                : p
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_likes" },
        (payload: any) => {
          // Update specific post when unliked
          setPosts((prevPosts) =>
            prevPosts.map((p) =>
              p.id === payload.old.post_id
                ? { ...p, likes_count: Math.max(0, p.likes_count - 1) }
                : p
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload: any) => {
          // Update specific post when comment is added (only count top-level comments)
          if (!payload.new.parent_comment_id) {
            setPosts((prevPosts) =>
              prevPosts.map((p) =>
                p.id === payload.new.post_id
                  ? { ...p, comments_count: p.comments_count + 1 }
                  : p
              )
            );
          }
          // Refresh comments for this post if expanded
          if (expandedComments.has(payload.new.post_id)) {
            fetchComments(payload.new.post_id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "comments" },
        (payload: any) => {
          // Update specific post when comment is deleted (only count top-level comments)
          if (!payload.old.parent_comment_id) {
            setPosts((prevPosts) =>
              prevPosts.map((p) =>
                p.id === payload.old.post_id
                  ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
                  : p
              )
            );
          }
          // Refresh comments for this post if expanded
          if (expandedComments.has(payload.old.post_id)) {
            fetchComments(payload.old.post_id);
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [fetchPosts, expandedComments]);

  useEffect(() => {
    fetchPosts();
    const unsubscribe = subscribeToPosts();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchPosts, subscribeToPosts]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;
    
    // ✅ Check if user is authenticated before upload
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to upload images");
      return null;
    }
    
    const ext = selectedImage.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    
    const { error } = await supabase.storage.from("post-images").upload(path, selectedImage);
    if (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload image: ${error.message}`);
      return null;
    }
    
    // ✅ Get public URL with null safety check
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    
    if (!data || !data.publicUrl) {
      toast.error("Failed to get image URL from storage");
      return null;
    }
    
    return data.publicUrl;
  };

  const createPost = async () => {
    if (!postContent.trim()) {
      toast.error("Post cannot be empty");
      return;
    }

    setPosting(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage();
      }

      const { error } = await (supabase as any).from("posts").insert({
        user_id: currentUserId,
        content: postContent.trim(),
        image_url: imageUrl,
      });

      if (!error) {
        toast.success("Post created! 🔥");
        setPostContent("");
        setSelectedImage(null);
        setImagePreview(null);
        await fetchPosts();
      } else {
        toast.error("Failed to create post");
      }
    } catch (err) {
      console.error("Error creating post:", err);
      toast.error("An error occurred");
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        // Unlike - optimistic update
        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, isLikedByMe: false, likes_count: Math.max(0, p.likes_count - 1) } : p
          )
        );
        // Delete from database
        const { error } = await (supabase.from("post_likes") as any)
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        
        if (error) {
          // Revert optimistic update on error
          await fetchPosts();
          toast.error("Failed to unlike post");
        }
      } else {
        // Like - optimistic update
        setPosts(posts.map((p) => (p.id === postId ? { ...p, isLikedByMe: true, likes_count: p.likes_count + 1 } : p)));
        // Insert into database
        const { error } = await (supabase.from("post_likes") as any).insert({ post_id: postId, user_id: currentUserId });
        
        if (error) {
          // Revert optimistic update on error
          await fetchPosts();
          toast.error("Failed to like post");
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Fetch fresh data in case of error
      await fetchPosts();
      toast.error("Failed to like post");
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await (supabase as any).from("posts").delete().eq("id", postId).eq("user_id", currentUserId);

      if (!error) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        toast.success("Post deleted 🗑️");
      } else {
        toast.error("Failed to delete post");
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      toast.error("An error occurred");
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data } = await (supabase.from("comments") as any)
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (data) {
        // Fetch user details with profile pictures
        const userIds = [...new Set((data as unknown[]).map((c: unknown) => (c as Record<string, unknown>).user_id))] as string[];
        const { data: users } = await supabase
          .from("users")
          .select("id, nickname, profile_picture_url")
          .in("id", userIds);
        const userMap = new Map((users as unknown[] | null)?.map((u: unknown) => [(u as Record<string, unknown>).id, u]) || []);

        // Build nested structure
        const commentMap = new Map<string, Comment>();
        const rootComments: Comment[] = [];

        (data as any[]).forEach((c) => {
          const enriched: Comment = {
            ...c,
            user: userMap.get(c.user_id) as Comment['user'],
            replies: [],
          };
          commentMap.set(c.id, enriched);
          if (!c.parent_comment_id) {
            rootComments.push(enriched);
          }
        });

        // Attach replies to parent comments
        commentMap.forEach((comment, id) => {
          if (comment.parent_comment_id) {
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
              parent.replies = parent.replies || [];
              parent.replies.push(comment);
            }
          }
        });

        setComments((prev) => ({ ...prev, [postId]: rootComments }));
        setCommentUsers((prev) => ({ ...prev, [postId]: userMap }));
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        if (!comments[postId]) {
          fetchComments(postId);
        }
      }
      return next;
    });
  };

  const submitComment = async (postId: string, parentCommentId?: string) => {
    const content = parentCommentId ? replyInput.trim() : commentInput[postId]?.trim();
    if (!content) {
      toast.error("Comment cannot be empty");
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const insertData: any = {
        post_id: postId,
        user_id: currentUserId,
        content,
      };
      if (parentCommentId) {
        insertData.parent_comment_id = parentCommentId;
      }

      const { error } = await (supabase as any).from("comments").insert(insertData);

      if (!error) {
        toast.success(parentCommentId ? "Reply posted! 💬" : "Comment posted! 💬");
        if (parentCommentId) {
          setReplyInput("");
          setReplyingTo(null);
        } else {
          setCommentInput((prev) => ({ ...prev, [postId]: "" }));
        }
        
        // Optimistically update comment count for main comments
        if (!parentCommentId) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
            )
          );
        }
        
        // Fetch comments to refresh the list
        await fetchComments(postId);
        
        // Auto-scroll to newest comment
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        toast.error("Failed to post comment");
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      toast.error("An error occurred");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const searchTerm = query.toLowerCase();
          const results: any[] = [];

          // Search players
          const { data: players } = await supabase
            .from("users")
            .select("id, nickname, uid, rank")
            .or(`nickname.ilike.%${searchTerm}%,uid.ilike.%${searchTerm}%`)
            .limit(5);

          if (players) {
            results.push(
              ...players.map((p) => ({
                type: "player",
                id: p.id,
                title: p.nickname,
                subtitle: `UID: ${p.uid}`,
                rank: p.rank,
              }))
            );
          }

          // Search squads
          const { data: squads } = await supabase
            .from("squads")
            .select("id, squad_name, squad_username")
            .or(`squad_name.ilike.%${searchTerm}%,squad_username.ilike.%${searchTerm}%`)
            .limit(5);

          if (squads) {
            results.push(
              ...squads.map((s) => ({
                type: "squad",
                id: s.id,
                title: s.squad_name,
                subtitle: `@${s.squad_username}`,
              }))
            );
          }

          setSearchResults(results);
          setShowSearchResults(true);
        } catch (err) {
          console.error("Search error:", err);
        }
      }, 300);
    },
    []
  );

  const handleSearchResultClick = (result: any) => {
    setSearchQuery("");
    setShowSearchResults(false);
    if (result.type === "player") {
      navigate(`/chat?user=${result.id}`);
    } else if (result.type === "squad") {
      navigate(`/squads`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Facebook-Style Header Section */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Top Row: Logo & Icon Buttons */}
          <div className="flex items-center justify-between mb-4">
            {/* Logo */}
            <h1 className="text-2xl font-bold text-foreground">RedZone</h1>
            
            {/* Icon Buttons Row */}
            <div className="flex items-center gap-3">
              {/* Plus Button */}
              <button className="w-10 h-10 rounded-full bg-secondary/60 hover:bg-secondary transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground">
                <Plus className="w-5 h-5" />
              </button>
              
              {/* Search Button */}
              <button className="w-10 h-10 rounded-full bg-secondary/60 hover:bg-secondary transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground">
                <Search className="w-5 h-5" />
              </button>
              
              {/* Messenger Button */}
              <button 
                onClick={() => navigate("/chat")}
                className="w-10 h-10 rounded-full bg-secondary/60 hover:bg-secondary transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Input Row: Avatar, Input Field, & Image Icon */}
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
              <span className="text-xs font-bold text-primary-foreground">G</span>
            </div>
            
            {/* Input Field & Image Icon Container */}
            <div className="flex-1 flex items-center gap-2 bg-secondary/50 hover:bg-secondary rounded-full px-4 py-2.5 transition-all border border-border/50 focus-within:border-primary/50">
              <input
                type="text"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's on your mind?"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
            
            {/* Image Icon Button */}
            <label className="w-10 h-10 rounded-full bg-secondary/60 hover:bg-secondary transition-colors flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0">
              <ImageIcon className="w-5 h-5" />
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
          </div>

          {/* Subtle Divider */}
          <div className="mt-4 border-t border-border/30" />
        </div>
      </div>

      {/* Image Preview & Post Button Section */}
      {(imagePreview || postContent.trim()) && (
        <div className="sticky top-[calc(100px+2.5rem)] z-40 bg-card/95 backdrop-blur-md border-t border-border/30">
          <div className="max-w-2xl mx-auto px-4 py-4">
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative mb-4 max-w-sm mx-auto">
                <div className="relative w-full rounded-lg overflow-hidden border border-border/50 shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto" />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Post Button */}
            <div className="flex justify-end">
              <button
                onClick={createPost}
                disabled={posting || !postContent.trim()}
                className="px-8 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-sm rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <AdBanner />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Gamepad2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No posts yet. Be the first to post! 🎮</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all space-y-4">
              {/* Post Header */}
              <div className="flex items-center justify-between relative">
                <button
                  onClick={() => navigate(`/chat?user=${post.user_id}`)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-bold text-primary-foreground text-sm shadow-sm overflow-hidden">
                    {post.user?.profile_picture_url ? (
                      <img src={post.user.profile_picture_url} alt={post.user.nickname} className="w-full h-full object-cover" />
                    ) : (
                      post.user?.nickname?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground leading-tight">{post.user?.nickname}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </button>
                {post.user_id === currentUserId && (
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Post options"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {openMenuId === post.id && (
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border/50 rounded-lg shadow-lg z-10 min-w-[160px]">
                        <button
                          onClick={() => {
                            deletePost(post.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Post Content */}
              <p className="text-sm text-foreground leading-6">{post.content}</p>

              {/* Post Image */}
              {post.image_url && (
                <div className="rounded-lg overflow-hidden border border-border/50">
                  <img src={post.image_url} alt="Post" className="w-full h-auto object-cover" />
                </div>
              )}

              {/* Post Stats */}
              <div className="flex gap-4 text-xs text-muted-foreground/70 pb-2 border-b border-border/50">
                <span className="hover:text-primary cursor-pointer transition-colors">{post.likes_count} likes</span>
                <span className="hover:text-primary cursor-pointer transition-colors">{post.comments_count} comments</span>
              </div>

              {/* Post Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleLike(post.id, post.isLikedByMe || false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: post.isLikedByMe ? "hsl(0,85%,50%)" : "hsl(0,0%,50%)",
                    backgroundColor: post.isLikedByMe ? "hsl(0,85%,50%,0.1)" : "transparent",
                  }}
                >
                  <Heart className="w-4 h-4" fill={post.isLikedByMe ? "currentColor" : "none"} />
                  Like
                </button>
                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Reply
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>

              {/* Comments Section */}
              {expandedComments.has(post.id) && (
                <div className="pt-3 mt-3 border-t border-border/50 space-y-3 animate-in fade-in">
                  {/* Existing Comments */}
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {!comments[post.id] || comments[post.id].length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 text-center py-6">No comments yet. Be the first!</p>
                    ) : (
                      <>
                        {comments[post.id]?.map((comment) => {
                          const hasReplies = comment.replies && comment.replies.length > 0;
                          const showReplies = expandedReplies.has(comment.id);
                          
                          return (
                            <div key={comment.id} className="space-y-2">
                              {/* Parent Comment Card */}
                              <div className="bg-secondary/20 rounded-xl p-3 hover:bg-secondary/25 transition-colors">
                                <div className="flex gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 text-[10px] font-semibold text-white shadow-sm overflow-hidden">
                                    {comment.user?.profile_picture_url ? (
                                      <img src={comment.user.profile_picture_url} alt={comment.user.nickname} className="w-full h-full object-cover" />
                                    ) : (
                                      comment.user?.nickname?.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-foreground">{comment.user?.nickname}</p>
                                      <p className="text-[10px] text-muted-foreground/60">
                                        {new Date(comment.created_at).toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                    <p className="text-xs text-foreground/90 mt-1 break-words leading-tight">{comment.content}</p>
                                    {/* Reply Button */}
                                    <button
                                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                      className="text-[10px] text-primary hover:text-primary/80 font-medium mt-1.5 transition-colors"
                                    >
                                      {replyingTo === comment.id ? "Cancel" : "Reply"}
                                    </button>
                                  </div>
                                </div>

                                {/* Reply Input for this comment */}
                                {replyingTo === comment.id && (
                                  <div className="flex gap-2 mt-3 ml-9">
                                    <input
                                      type="text"
                                      value={replyInput}
                                      onChange={(e) => setReplyInput(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === "Enter" && !submittingComment[post.id]) {
                                          submitComment(post.id, comment.id);
                                        }
                                      }}
                                      placeholder="Write a reply…"
                                      autoFocus
                                      className="flex-1 bg-secondary/50 border border-border/50 rounded-full px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                    <button
                                      onClick={() => submitComment(post.id, comment.id)}
                                      disabled={submittingComment[post.id] || !replyInput.trim()}
                                      className="px-3 py-1.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground text-[10px] font-semibold rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                      {submittingComment[post.id] ? "..." : "Reply"}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Replies Section */}
                              {hasReplies && (
                                <div className="ml-7 space-y-2 border-l-2 border-border/30 pl-3">
                                  {/* Show Replies Button */}
                                  {!showReplies && (
                                    <button
                                      onClick={() => setExpandedReplies((prev) => {
                                        const next = new Set(prev);
                                        next.add(comment.id);
                                        return next;
                                      })}
                                      className="text-[10px] text-primary/70 hover:text-primary font-medium transition-colors"
                                    >
                                      ↳ View {comment.replies?.length || 0} {comment.replies?.length === 1 ? "reply" : "replies"}
                                    </button>
                                  )}

                                  {/* Render Replies */}
                                  {showReplies && (
                                    <>
                                      {comment.replies?.map((reply) => (
                                        <div key={reply.id} className="bg-secondary/10 rounded-lg p-2.5 hover:bg-secondary/15 transition-colors">
                                          <div className="flex gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center flex-shrink-0 text-[9px] font-semibold text-white shadow-sm overflow-hidden">
                                              {reply.user?.profile_picture_url ? (
                                                <img src={reply.user.profile_picture_url} alt={reply.user.nickname} className="w-full h-full object-cover" />
                                              ) : (
                                                reply.user?.nickname?.charAt(0).toUpperCase()
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1">
                                                <p className="text-[11px] font-bold text-foreground">{reply.user?.nickname}</p>
                                                <p className="text-[9px] text-muted-foreground/50">
                                                  {new Date(reply.created_at).toLocaleDateString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                  })}
                                                </p>
                                              </div>
                                              <p className="text-[10px] text-foreground/80 mt-0.5 break-words leading-snug">{reply.content}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => setExpandedReplies((prev) => {
                                          const next = new Set(prev);
                                          next.delete(comment.id);
                                          return next;
                                        })}
                                        className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground font-medium transition-colors"
                                      >
                                        Hide replies
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div ref={commentsEndRef} />
                      </>
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="flex gap-2 pt-2 border-t border-border/30">
                    <input
                      type="text"
                      value={commentInput[post.id] || ""}
                      onChange={(e) =>
                        setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !submittingComment[post.id]) {
                          submitComment(post.id);
                        }
                      }}
                      placeholder="Write a reply…"
                      className="flex-1 bg-secondary/50 border border-border/50 rounded-full px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-secondary transition-all"
                    />
                    <button
                      onClick={() => submitComment(post.id)}
                      disabled={submittingComment[post.id] || !commentInput[post.id]?.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground text-xs font-semibold rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {submittingComment[post.id] ? "..." : "Reply"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;
