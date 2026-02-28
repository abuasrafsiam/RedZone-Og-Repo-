-- Post Counter Update Triggers
-- This migration adds triggers to automatically update likes_count and comments_count
-- whenever post_likes or comments records are inserted or deleted

-- Function to increment likes count
CREATE OR REPLACE FUNCTION increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement likes count
CREATE OR REPLACE FUNCTION decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to increment comments count
CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only count top-level comments (no parent_comment_id)
  IF NEW.parent_comment_id IS NULL THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement comments count
CREATE OR REPLACE FUNCTION decrement_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only count top-level comments (no parent_comment_id)
  IF OLD.parent_comment_id IS NULL THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger for post_likes INSERT
DROP TRIGGER IF EXISTS post_likes_increment_trigger ON post_likes;
CREATE TRIGGER post_likes_increment_trigger
AFTER INSERT ON post_likes
FOR EACH ROW
EXECUTE FUNCTION increment_likes_count();

-- Create or replace trigger for post_likes DELETE
DROP TRIGGER IF EXISTS post_likes_decrement_trigger ON post_likes;
CREATE TRIGGER post_likes_decrement_trigger
AFTER DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION decrement_likes_count();

-- Create or replace trigger for comments INSERT
DROP TRIGGER IF EXISTS comments_increment_trigger ON comments;
CREATE TRIGGER comments_increment_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION increment_comments_count();

-- Create or replace trigger for comments DELETE
DROP TRIGGER IF EXISTS comments_decrement_trigger ON comments;
CREATE TRIGGER comments_decrement_trigger
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION decrement_comments_count();
