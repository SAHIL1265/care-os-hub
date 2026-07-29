CREATE TYPE public.medicine_scan_type AS ENUM ('camera', 'barcode', 'qr');

CREATE TABLE public.medicine_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type public.medicine_scan_type NOT NULL DEFAULT 'camera',
  medicine_name text NOT NULL DEFAULT 'Unknown medicine',
  raw_text text,
  info jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(5,2),
  language text NOT NULL DEFAULT 'en',
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicine_scans TO authenticated;
GRANT ALL ON public.medicine_scans TO service_role;

ALTER TABLE public.medicine_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medicine_scans - own select" ON public.medicine_scans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "medicine_scans - own insert" ON public.medicine_scans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medicine_scans - own update" ON public.medicine_scans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medicine_scans - own delete" ON public.medicine_scans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_medicine_scans_updated_at
  BEFORE UPDATE ON public.medicine_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX medicine_scans_user_created_idx ON public.medicine_scans (user_id, created_at DESC);