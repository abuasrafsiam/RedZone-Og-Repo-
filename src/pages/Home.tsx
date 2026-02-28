import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Share2, Image as ImageIcon, X, Gamepad2, Trash2, MoreVertical } from "lucide-react";
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
  user?: { id: string; nickname: string; profile_picture_url?: string };
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
      .channel("posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [fetchPosts]);

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
    const ext = selectedImage.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("post-images").upload(path, selectedImage);
    if (error) {
      toast.error("Failed to upload image");
      return null;
    }
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
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
        // Unlike
        await (supabase.from("post_likes") as any).delete().eq("post_id", postId).eq("user_id", currentUserId);
        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, isLikedByMe: false, likes_count: Math.max(0, p.likes_count - 1) } : p
          )
        );
      } else {
        // Like
        await (supabase.from("post_likes") as any).insert({ post_id: postId, user_id: currentUserId });
        setPosts(posts.map((p) => (p.id === postId ? { ...p, isLikedByMe: true, likes_count: p.likes_count + 1 } : p)));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
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

        const enrichedComments = (data as unknown[]).map((c: unknown) => ({
          ...(c as Comment),
          user: userMap.get((c as Record<string, unknown>).user_id as string) as Comment['user'],
        }));

        setComments((prev) => ({ ...prev, [postId]: enrichedComments as Comment[] }));
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

  const submitComment = async (postId: string) => {
    const content = commentInput[postId]?.trim();
    if (!content) {
      toast.error("Comment cannot be empty");
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const { error } = await (supabase as any).from("comments").insert({
        post_id: postId,
        user_id: currentUserId,
        content,
      });

      if (!error) {
        toast.success("Comment posted! 💬");
        setCommentInput((prev) => ({ ...prev, [postId]: "" }));
        await fetchComments(postId);
        // Update comment count
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
          )
        );
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
      {/* Create Post Section */}
      <div className="sticky top-0 z-40 bg-background border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Post Input */}
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-primary-foreground">G</span>
            </div>
            <input
              type="text"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What's on your mind?"
              className="flex-1 bg-secondary/50 hover:bg-secondary border border-border/50 rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-secondary transition-all"
            />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mb-3 ml-12 max-w-xs">
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-12">
            <label className="px-3 py-2 rounded-full hover:bg-primary/5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors inline-flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Photo</span>
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
            <div className="flex-1" />
            <button
              onClick={createPost}
              disabled={posting || !postContent.trim()}
              className="px-6 py-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-sm rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>

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
                  <div className="bg-secondary/20 rounded-xl p-3 space-y-2 max-h-64 overflow-y-auto">
                    {!comments[post.id] || comments[post.id].length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 text-center py-6">No comments yet. Be the first!</p>
                    ) : (
                      <>
                        {comments[post.id]?.map((comment) => (
                          <div key={comment.id} className="flex gap-2.5 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
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
                              <p className="text-xs text-foreground/90 mt-0.5 break-words leading-tight">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={commentsEndRef} />
                      </>
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="flex gap-2">
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
