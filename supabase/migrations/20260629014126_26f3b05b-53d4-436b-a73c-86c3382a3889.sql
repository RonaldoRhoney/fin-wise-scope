
-- Add reaction type to feedback_likes
ALTER TABLE public.feedback_likes ADD COLUMN IF NOT EXISTS reaction TEXT NOT NULL DEFAULT 'like';
ALTER TABLE public.feedback_likes ADD CONSTRAINT feedback_likes_reaction_chk CHECK (reaction IN ('like','love','thumbsup'));
-- Replace unique constraint to allow multiple reaction types per user
ALTER TABLE public.feedback_likes DROP CONSTRAINT IF EXISTS feedback_likes_feedback_id_auth_user_id_key;
ALTER TABLE public.feedback_likes DROP CONSTRAINT IF EXISTS feedback_likes_pkey_unique;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_likes_unique_reaction ON public.feedback_likes (feedback_id, auth_user_id, reaction);

-- Replies table
CREATE TABLE IF NOT EXISTS public.feedback_replies (
  id BIGSERIAL PRIMARY KEY,
  feedback_id BIGINT NOT NULL REFERENCES public.app_feedback(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_replies TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.feedback_replies_id_seq TO authenticated;
GRANT ALL ON public.feedback_replies TO service_role;
GRANT ALL ON SEQUENCE public.feedback_replies_id_seq TO service_role;
ALTER TABLE public.feedback_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "replies_select_all" ON public.feedback_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "replies_insert_own" ON public.feedback_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "replies_delete_own" ON public.feedback_replies FOR DELETE TO authenticated USING (auth.uid() = auth_user_id);
