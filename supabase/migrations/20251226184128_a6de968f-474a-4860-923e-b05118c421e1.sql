-- Add custom info fields to matches table
ALTER TABLE public.matches
ADD COLUMN info_image TEXT,
ADD COLUMN info_text_1 TEXT,
ADD COLUMN info_text_2 TEXT;