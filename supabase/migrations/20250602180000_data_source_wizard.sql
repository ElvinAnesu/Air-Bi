-- Run in Supabase SQL editor if not applied via CLI

ALTER TABLE public.data_source_tables
  ADD COLUMN IF NOT EXISTS cleaning_config_json jsonb DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.data_source_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid NOT NULL REFERENCES public.data_sources(id) ON DELETE CASCADE,
  from_table_id uuid NOT NULL REFERENCES public.data_source_tables(id) ON DELETE CASCADE,
  from_column text NOT NULL,
  to_table_id uuid NOT NULL REFERENCES public.data_source_tables(id) ON DELETE CASCADE,
  to_column text NOT NULL,
  join_type text NOT NULL DEFAULT 'inner' CHECK (join_type IN ('inner', 'left')),
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_source_relationships_data_source_id
  ON public.data_source_relationships(data_source_id);

CREATE TABLE IF NOT EXISTS public.data_source_wizard_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  created_by uuid NOT NULL,
  excel_file_name text,
  excel_storage_path text,
  connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_source_wizard_sessions_team_id
  ON public.data_source_wizard_sessions(team_id);
