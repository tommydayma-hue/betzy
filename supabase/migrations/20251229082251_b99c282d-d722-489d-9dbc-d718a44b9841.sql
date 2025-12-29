-- Create user_bans table to track banned/suspended users
CREATE TABLE public.user_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  banned_until TIMESTAMP WITH TIME ZONE, -- NULL means permanent ban
  banned_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Only admins can manage bans
CREATE POLICY "Admins can manage user bans"
ON public.user_bans
FOR ALL
USING (public.is_admin());

-- Users can view their own ban status
CREATE POLICY "Users can view their own bans"
ON public.user_bans
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check if a user is currently banned
CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id UUID)
RETURNS TABLE(is_banned BOOLEAN, reason TEXT, banned_until TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS is_banned,
    ub.reason,
    ub.banned_until
  FROM public.user_bans ub
  WHERE ub.user_id = p_user_id
    AND ub.is_active = true
    AND (ub.banned_until IS NULL OR ub.banned_until > now())
  ORDER BY ub.banned_at DESC
  LIMIT 1;
  
  -- If no active ban found, return not banned
  IF NOT FOUND THEN
    RETURN QUERY SELECT false AS is_banned, NULL::TEXT AS reason, NULL::TIMESTAMP WITH TIME ZONE AS banned_until;
  END IF;
END;
$$;

-- Create index for faster lookups
CREATE INDEX idx_user_bans_user_id ON public.user_bans(user_id);
CREATE INDEX idx_user_bans_active ON public.user_bans(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_user_bans_updated_at
BEFORE UPDATE ON public.user_bans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();