ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_name_length_chk CHECK (char_length(name) <= 200);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_length_chk CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 400000);
ALTER TABLE public.app_feedback ADD CONSTRAINT app_feedback_author_length_chk CHECK (char_length(author_name) <= 200);