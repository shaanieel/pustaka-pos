-- ============================================================
-- Auto-sync: saat profile baru dibuat, otomatis jadi customer
-- ============================================================

-- Cek apakah user udah ada di customers
CREATE OR REPLACE FUNCTION public.sync_profile_to_customer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (name, phone, email, notes)
  VALUES (
    NEW.full_name,
    NEW.phone,
    NEW.email,
    'Auto-sync dari registrasi akun'
  )
  -- Skip kalau email udah terdaftar
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after insert on profiles
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_customer();
