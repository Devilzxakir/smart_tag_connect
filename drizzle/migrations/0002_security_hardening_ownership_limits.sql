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