CREATE TYPE public.report_status AS ENUM ('uploading','processing','complete','failed');

CREATE TABLE public.medical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  patient_label text NOT NULL DEFAULT 'Me',
  file_name text NOT NULL,
  file_path text,
  file_type text NOT NULL DEFAULT 'image',
  source text NOT NULL DEFAULT 'upload',
  report_type text NOT NULL DEFAULT 'Medical Report',
  extracted_text text,
  structured_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  important_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  doctor_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  simple_explanation text,
  ocr_confidence numeric,
  processing_status public.report_status NOT NULL DEFAULT 'processing',
  error_message text,
  chat jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_reports TO authenticated;
GRANT ALL ON public.medical_reports TO service_role;

ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_reports - own select" ON public.medical_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "medical_reports - own insert" ON public.medical_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medical_reports - own update" ON public.medical_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medical_reports - own delete" ON public.medical_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_medical_reports_user_created ON public.medical_reports (user_id, created_at DESC);

CREATE TRIGGER update_medical_reports_updated_at
BEFORE UPDATE ON public.medical_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();