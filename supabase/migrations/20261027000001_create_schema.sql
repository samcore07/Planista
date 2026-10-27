-- Supabase Schema Migration: Core Entities & Row Level Security
-- Enables UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles trigger on auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  guest_count INTEGER NOT NULL DEFAULT 0 CHECK (guest_count >= 0),
  total_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_budget >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('draft', 'planning', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);

-- 3. Event Collaborators
CREATE TABLE IF NOT EXISTS public.event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON public.event_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_event_id ON public.event_collaborators(event_id);

-- Helper function to check event membership/ownership
CREATE OR REPLACE FUNCTION public.has_event_access(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events WHERE id = p_event_id AND user_id = p_user_id
    UNION
    SELECT 1 FROM public.event_collaborators WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;

-- 4. Event Preferences
CREATE TABLE IF NOT EXISTS public.event_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  style_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Budget Categories
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (allocated_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_event_id ON public.budget_categories(event_id);

-- 6. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  estimated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_amount >= 0),
  actual_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (actual_amount >= 0),
  deposit_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_paid >= 0),
  due_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON public.expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);

-- 7. Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  quoted_amount NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'quoted', 'contracted', 'declined')),
  contract_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_event_id ON public.vendors(event_id);

-- 8. Timeline Tasks
CREATE TABLE IF NOT EXISTS public.timeline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  assignee TEXT,
  category TEXT,
  estimated_duration_hours NUMERIC(5, 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON public.timeline_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.timeline_tasks(due_date);

-- 9. Task Dependencies
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.timeline_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.timeline_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- 10. Theme Concepts
CREATE TABLE IF NOT EXISTS public.theme_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  color_palette JSONB NOT NULL DEFAULT '[]'::jsonb,
  decor_direction TEXT,
  lighting_styling TEXT,
  floral_ideas TEXT,
  invitation_direction TEXT,
  moodboard_urls JSONB DEFAULT '[]'::jsonb,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_themes_event_id ON public.theme_concepts(event_id);

-- 11. Risk Assessments
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL,
  explanation TEXT NOT NULL,
  supporting_facts JSONB DEFAULT '[]'::jsonb,
  mitigation_action TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risks_event_id ON public.risk_assessments(event_id);

-- 12. Uploaded Documents
CREATE TABLE IF NOT EXISTS public.uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'invoice', 'receipt', 'contract', 'other')),
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_event_id ON public.uploaded_documents(event_id);

-- ==============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update only their own profile
CREATE POLICY "Profiles read policy" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles update policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Events: Users can access events they own or collaborate on
CREATE POLICY "Events select policy" ON public.events
  FOR SELECT USING (public.has_event_access(id, auth.uid()));

CREATE POLICY "Events insert policy" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Events update policy" ON public.events
  FOR UPDATE USING (public.has_event_access(id, auth.uid()));

CREATE POLICY "Events delete policy" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- Collaborators policies
CREATE POLICY "Collaborators select policy" ON public.event_collaborators
  FOR SELECT USING (public.has_event_access(event_id, auth.uid()));

CREATE POLICY "Collaborators mutate policy" ON public.event_collaborators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid())
  );

-- Helper macro for child entity policies
-- Event child tables inherit access via has_event_access(event_id, auth.uid())
CREATE POLICY "Event preferences policy" ON public.event_preferences
  FOR ALL USING (public.has_event_access(event_id, auth.uid()));

CREATE POLICY "Budget categories policy" ON public.budget_categories
  FOR ALL USING (public.has_event_access(event_id, auth.uid()));

CREATE POLICY "Expenses policy" ON public.expenses
  FOR ALL USING (public.has_event_access(event_id, auth.uid()));

CREATE POLICY "Vendors policy" ON public.vendors
  FOR ALL USING (public.has_event_access(event_id, auth.uid()));

CREATE POLICY "Timeline tasks policy" ON public.timeline_tasks
  FOR ALL USING (public.has_event_access(event_id, auth.uid()));

CREATE POLICY "Task dependencies policy" ON public.task_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.timeline_tasks t
      WHERE t.id = task_id AND public.has_event_access(t.event_id, auth.uid())
    )
  );

CREATE POLICY "Theme concepts policy" ON public.theme_concepts
  FOR ALL USING (public.has_event_access(event_id, auth.uid()));

CREATE POLICY "Risk assessments policy" ON public.risk_assessments
  FOR ALL USING (public.has_event_access(event_id, auth.uid()));

CREATE POLICY "Uploaded documents policy" ON public.uploaded_documents
  FOR ALL USING (public.has_event_access(event_id, auth.uid()));
