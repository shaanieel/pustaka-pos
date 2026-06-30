-- Add payment columns to orders table
-- Run this in Supabase SQL Editor

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'tunai',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'belum_bayar',
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

-- Update existing completed orders to "lunas"
UPDATE public.orders
SET payment_status = 'lunas',
    paid_amount = final_amount
WHERE status = 'completed' AND payment_status IS NULL;
