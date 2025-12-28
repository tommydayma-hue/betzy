-- Add UTR number column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN utr_number TEXT;