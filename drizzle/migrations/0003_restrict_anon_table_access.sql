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