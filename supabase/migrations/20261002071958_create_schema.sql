CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  number INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'direct' CHECK (mode IN ('direct','dynamic')),
  public_code TEXT NOT NULL UNIQUE,
  content_type TEXT,
  content TEXT NOT NULL DEFAULT '',
  written_content TEXT,
  demo_content TEXT,
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty','written','demo','failed')),
  verified TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_written_at TIMESTAMPTZ
);

CREATE INDEX tags_user_id_idx ON public.tags (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own tags" ON public.tags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own tags" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own tags" ON public.tags
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own tags" ON public.tags
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.tag_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  destination TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tag_destinations_tag_id_idx ON public.tag_destinations (tag_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_destinations TO authenticated;
GRANT ALL ON public.tag_destinations TO service_role;

ALTER TABLE public.tag_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own destinations" ON public.tag_destinations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own destinations" ON public.tag_destinations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own destinations" ON public.tag_destinations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own destinations" ON public.tag_destinations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Landing pages
CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  image_url text,
  description text,
  website text,
  phone text,
  email text,
  google_review text,
  socials jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT ALL ON public.landing_pages TO service_role;

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their landing pages" ON public.landing_pages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners create landing pages" ON public.landing_pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their landing pages" ON public.landing_pages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their landing pages" ON public.landing_pages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tag columns for destination kind + lost mode
ALTER TABLE public.tags
  ADD COLUMN destination_kind text NOT NULL DEFAULT 'website',
  ADD COLUMN landing_page_id uuid REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  ADD COLUMN lost_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN lost_message text,
  ADD COLUMN lost_contact_name text,
  ADD COLUMN lost_contact_phone text,
  ADD COLUMN lost_contact_email text,
  ADD COLUMN lost_form_enabled boolean NOT NULL DEFAULT true;

-- Finder reports from the lost-mode contact form
CREATE TABLE public.lost_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  finder_name text,
  finder_contact text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.lost_reports TO authenticated;
GRANT ALL ON public.lost_reports TO service_role;

ALTER TABLE public.lost_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read reports for their tags" ON public.lost_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_id AND t.user_id = auth.uid()));
CREATE POLICY "Owners delete reports for their tags" ON public.lost_reports
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_id AND t.user_id = auth.uid()));

-- Scan analytics (no GPS, no fingerprints)
CREATE TABLE public.tag_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'nfc',
  device_type text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tag_events_tag_id_created_at_idx ON public.tag_events (tag_id, created_at DESC);

GRANT SELECT ON public.tag_events TO authenticated;
GRANT ALL ON public.tag_events TO service_role;

ALTER TABLE public.tag_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read events for their tags" ON public.tag_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_id AND t.user_id = auth.uid()));

-- 1. tag_destinations must belong to a tag the caller owns, not just carry their user_id.
DROP POLICY IF EXISTS "Users create their own destinations" ON public.tag_destinations;
DROP POLICY IF EXISTS "Users read their own destinations" ON public.tag_destinations;
DROP POLICY IF EXISTS "Users update their own destinations" ON public.tag_destinations;
DROP POLICY IF EXISTS "Users delete their own destinations" ON public.tag_destinations;

CREATE POLICY "Owners read destinations for their tags"
ON public.tag_destinations FOR SELECT TO authenticated
USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_destinations.tag_id AND t.user_id = auth.uid()));

CREATE POLICY "Owners create destinations for their tags"
ON public.tag_destinations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_destinations.tag_id AND t.user_id = auth.uid()));

CREATE POLICY "Owners update destinations for their tags"
ON public.tag_destinations FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_destinations.tag_id AND t.user_id = auth.uid()))
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_destinations.tag_id AND t.user_id = auth.uid()));

CREATE POLICY "Owners delete destinations for their tags"
ON public.tag_destinations FOR DELETE TO authenticated
USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_destinations.tag_id AND t.user_id = auth.uid()));

-- 2. Server-side size limits so no client can store oversized or absurd payloads.
ALTER TABLE public.tags
  ADD CONSTRAINT tags_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  ADD CONSTRAINT tags_content_len CHECK (char_length(content) <= 4000),
  ADD CONSTRAINT tags_public_code_fmt CHECK (public_code ~ '^[A-Z0-9]{6,32}$'),
  ADD CONSTRAINT tags_lost_message_len CHECK (lost_message IS NULL OR char_length(lost_message) <= 1000),
  ADD CONSTRAINT tags_lost_contact_len CHECK (
    (lost_contact_name IS NULL OR char_length(lost_contact_name) <= 120)
    AND (lost_contact_phone IS NULL OR char_length(lost_contact_phone) <= 40)
    AND (lost_contact_email IS NULL OR char_length(lost_contact_email) <= 200)
  );

ALTER TABLE public.tag_destinations
  ADD CONSTRAINT tag_destinations_len CHECK (char_length(destination) BETWEEN 1 AND 2000);

ALTER TABLE public.landing_pages
  ADD CONSTRAINT landing_pages_slug_fmt CHECK (slug ~ '^[a-z0-9-]{2,64}$'),
  ADD CONSTRAINT landing_pages_text_len CHECK (
    char_length(title) BETWEEN 1 AND 120
    AND (description IS NULL OR char_length(description) <= 2000)
    AND (website IS NULL OR char_length(website) <= 2000)
    AND (google_review IS NULL OR char_length(google_review) <= 2000)
    AND (image_url IS NULL OR char_length(image_url) <= 2000)
    AND (phone IS NULL OR char_length(phone) <= 40)
    AND (email IS NULL OR char_length(email) <= 200)
  ),
  ADD CONSTRAINT landing_pages_socials_shape CHECK (
    jsonb_typeof(socials) = 'array' AND jsonb_array_length(socials) <= 12
  );

ALTER TABLE public.lost_reports
  ADD CONSTRAINT lost_reports_len CHECK (
    char_length(message) BETWEEN 1 AND 1000
    AND (finder_name IS NULL OR char_length(finder_name) <= 120)
    AND (finder_contact IS NULL OR char_length(finder_contact) <= 200)
  );

ALTER TABLE public.tag_events
  ADD CONSTRAINT tag_events_source_check CHECK (source IN ('nfc','qr')),
  ADD CONSTRAINT tag_events_meta_len CHECK (
    (device_type IS NULL OR char_length(device_type) <= 20)
    AND (country IS NULL OR char_length(country) <= 8)
  );

-- 3. Abuse protection for the public finder form and public scan logging.
CREATE OR REPLACE FUNCTION public.limit_lost_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recent int;
BEGIN
  SELECT count(*) INTO recent FROM public.lost_reports
   WHERE tag_id = NEW.tag_id AND created_at > now() - interval '1 hour';
  IF recent >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.limit_lost_reports() FROM anon, authenticated;

DROP TRIGGER IF EXISTS lost_reports_rate_limit ON public.lost_reports;
CREATE TRIGGER lost_reports_rate_limit
BEFORE INSERT ON public.lost_reports
FOR EACH ROW EXECUTE FUNCTION public.limit_lost_reports();

CREATE OR REPLACE FUNCTION public.limit_tag_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recent int;
BEGIN
  SELECT count(*) INTO recent FROM public.tag_events
   WHERE tag_id = NEW.tag_id AND created_at > now() - interval '1 minute';
  IF recent >= 60 THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.limit_tag_events() FROM anon, authenticated;

DROP TRIGGER IF EXISTS tag_events_rate_limit ON public.tag_events;
CREATE TRIGGER tag_events_rate_limit
BEFORE INSERT ON public.tag_events
FOR EACH ROW EXECUTE FUNCTION public.limit_tag_events();

-- No policy grants the anonymous role anything on these tables; public pages are
-- served by trusted server code. Remove the unused anon privileges entirely.
REVOKE ALL ON public.tags FROM anon;
REVOKE ALL ON public.tag_destinations FROM anon;
REVOKE ALL ON public.tag_events FROM anon;
REVOKE ALL ON public.lost_reports FROM anon;
REVOKE ALL ON public.landing_pages FROM anon;

-- Signed-in users keep exactly what their policies allow.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_destinations TO authenticated;
GRANT SELECT ON public.tag_events TO authenticated;
GRANT SELECT, DELETE ON public.lost_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT ALL ON public.tags, public.tag_destinations, public.tag_events, public.lost_reports, public.landing_pages TO service_role;