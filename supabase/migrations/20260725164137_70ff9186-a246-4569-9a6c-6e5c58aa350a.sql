
-- Enums
CREATE TYPE public.availability_status AS ENUM ('available', 'busy', 'away', 'offline', 'dnd');
CREATE TYPE public.relationship_type AS ENUM ('father','mother','brother','sister','son','daughter','spouse','guardian','doctor','other');
CREATE TYPE public.alert_type AS ENUM ('normal','important','emergency','call_back_request');
CREATE TYPE public.alert_priority AS ENUM ('low','normal','high','critical');
CREATE TYPE public.alert_status AS ENUM ('unread','read','dismissed');
CREATE TYPE public.call_status AS ENUM ('initiated','missed','completed','busy','declined');

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- family_members
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  relationship public.relationship_type NOT NULL DEFAULT 'other',
  phone_number TEXT NOT NULL,
  email TEXT,
  profile_photo TEXT,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT false,
  availability_status public.availability_status NOT NULL DEFAULT 'available',
  notification_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own family members - select" ON public.family_members FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = linked_user_id);
CREATE POLICY "own family members - insert" ON public.family_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own family members - update" ON public.family_members FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own family members - delete" ON public.family_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_family_members_updated BEFORE UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_family_members_user ON public.family_members(user_id);

-- alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
  alert_type public.alert_type NOT NULL DEFAULT 'normal',
  priority public.alert_priority NOT NULL DEFAULT 'normal',
  message TEXT NOT NULL,
  status public.alert_status NOT NULL DEFAULT 'unread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts - participants select" ON public.alerts FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "alerts - sender insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "alerts - recipient update" ON public.alerts FOR UPDATE TO authenticated USING (auth.uid() = receiver_id OR auth.uid() = sender_id) WITH CHECK (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "alerts - sender delete" ON public.alerts FOR DELETE TO authenticated USING (auth.uid() = sender_id);
CREATE INDEX idx_alerts_receiver ON public.alerts(receiver_id, created_at DESC);
CREATE INDEX idx_alerts_sender ON public.alerts(sender_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;

-- call_logs
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  call_status public.call_status NOT NULL DEFAULT 'initiated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_logs TO authenticated;
GRANT ALL ON public.call_logs TO service_role;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call_logs - own select" ON public.call_logs FOR SELECT TO authenticated USING (auth.uid() = caller_id);
CREATE POLICY "call_logs - own insert" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "call_logs - own update" ON public.call_logs FOR UPDATE TO authenticated USING (auth.uid() = caller_id) WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "call_logs - own delete" ON public.call_logs FOR DELETE TO authenticated USING (auth.uid() = caller_id);
CREATE INDEX idx_call_logs_caller ON public.call_logs(caller_id, created_at DESC);
