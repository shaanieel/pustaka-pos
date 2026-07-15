-- Add payment columns to orders table
-- Run this in Supabase SQL Editor
-- BOSSS: copy-paste ke Supabase Dashboard > SQL Editor > Run

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'tunai',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'belum_bayar',
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

-- Update existing completed orders to "lunas"
UPDATE public.orders
SET payment_status = COALESCE(payment_status, 'lunas'),
    paid_amount = COALESCE(paid_amount, final_amount),
    payment_confirmed_at = COALESCE(payment_confirmed_at, created_at)
WHERE status = 'completed' AND payment_status IS NULL;
