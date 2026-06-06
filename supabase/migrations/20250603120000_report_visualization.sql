-- Custom AI-driven report views (replaces rigid bar/line/pie-only model)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS visualization_json jsonb;

COMMENT ON COLUMN public.reports.visualization_json IS 'AI-selected report views: tabs, chart kinds, column bindings';
