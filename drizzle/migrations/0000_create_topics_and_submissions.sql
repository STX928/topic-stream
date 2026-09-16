-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- The very first account to sign up becomes the owner (admin).
CREATE OR REPLACE FUNCTION public.assign_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_first_user_admin();

-- Topics
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  is_taken boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.topics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view topics"
ON public.topics FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Only admin can add topics"
ON public.topics FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admin can update topics"
ON public.topics FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admin can delete topics"
ON public.topics FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Submissions
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  topic_id uuid NOT NULL UNIQUE REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX submissions_student_name_unique
ON public.submissions (lower(btrim(student_name)));

GRANT INSERT ON public.submissions TO anon;
GRANT SELECT, INSERT, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit once"
ON public.submissions FOR INSERT TO anon, authenticated
WITH CHECK (btrim(student_name) <> '' AND length(student_name) <= 120);

CREATE POLICY "Only admin can view submissions"
ON public.submissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admin can delete submissions"
ON public.submissions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Keep topics.is_taken in sync
CREATE OR REPLACE FUNCTION public.sync_topic_taken()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.topics SET is_taken = true WHERE id = NEW.topic_id;
    RETURN NEW;
  ELSE
    UPDATE public.topics SET is_taken = false WHERE id = OLD.topic_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER submissions_sync_topic_taken
AFTER INSERT OR DELETE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.sync_topic_taken();

-- Block claiming an already-taken topic at the database level
CREATE OR REPLACE FUNCTION public.check_topic_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.submissions WHERE topic_id = NEW.topic_id) THEN
    RAISE EXCEPTION 'This topic has already been taken';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER submissions_check_topic_available
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.check_topic_available();
