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
