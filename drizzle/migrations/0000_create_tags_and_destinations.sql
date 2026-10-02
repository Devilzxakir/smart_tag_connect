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