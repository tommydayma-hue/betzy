-- Add case-insensitive unique constraint on username
-- This prevents duplicate usernames while allowing NULL values
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;