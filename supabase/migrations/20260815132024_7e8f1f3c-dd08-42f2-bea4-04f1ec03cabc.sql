CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','today','completed','cancelled','failed');
CREATE TYPE public.appointment_provider_type AS ENUM ('doctor','hospital','clinic');
CREATE TYPE public.appointment_booking_source AS ENUM ('manual','ai','direct_call');
CREATE TYPE public.ai_call_status AS ENUM ('pending','dialing','in_progress','completed','failed','cancelled');
CREATE TYPE public.reminder_channel AS ENUM ('in_app','sms');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  provider_type public.appointment_provider_type NOT NULL DEFAULT 'doctor',
  provider_name text NOT NULL,
  doctor_name text,
  contact_number text NOT NULL,
  location text,
  department text,
  preferred_date date,
  preferred_time time,
  notes text,
  reason text,
  patient_name text,
  patient_contact text,
  share_patient_contact boolean NOT NULL DEFAULT false,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  booking_source public.appointment_booking_source NOT NULL DEFAULT 'manual',
  confirmed_date date,
  confirmed_time time,
  token_number text,
  consultation_fee text,
  special_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments - own select" ON public.appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "appointments - own insert" ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointments - own update" ON public.appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointments - own delete" ON public.appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  offset_minutes integer NOT NULL DEFAULT 1440,
  channel public.reminder_channel NOT NULL DEFAULT 'in_app',
  message text NOT NULL,
  remind_at timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_reminders TO authenticated;
GRANT ALL ON public.appointment_reminders TO service_role;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointment_reminders - own select" ON public.appointment_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "appointment_reminders - own insert" ON public.appointment_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointment_reminders - own update" ON public.appointment_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointment_reminders - own delete" ON public.appointment_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_booking_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  provider_call_sid text,
  telephony_provider text NOT NULL DEFAULT 'simulated',
  status public.ai_call_status NOT NULL DEFAULT 'pending',
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_booking_calls TO authenticated;
GRANT ALL ON public.ai_booking_calls TO service_role;
ALTER TABLE public.ai_booking_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_booking_calls - own select" ON public.ai_booking_calls FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_booking_calls - own insert" ON public.ai_booking_calls FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_booking_calls - own update" ON public.ai_booking_calls FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_booking_calls - own delete" ON public.ai_booking_calls FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_appointments_user ON public.appointments(user_id, created_at DESC);
CREATE INDEX idx_reminders_user ON public.appointment_reminders(user_id, remind_at);
CREATE INDEX idx_ai_calls_appointment ON public.ai_booking_calls(appointment_id, created_at DESC);

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointment_reminders_updated_at BEFORE UPDATE ON public.appointment_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_booking_calls_updated_at BEFORE UPDATE ON public.ai_booking_calls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();