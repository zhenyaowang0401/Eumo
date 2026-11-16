-- Run once in Supabase SQL Editor. No original web saves are modified.
CREATE TABLE IF NOT EXISTS public.eumo_dig_streams (
 writer_hash text PRIMARY KEY CHECK (writer_hash ~ '^[a-f0-9]{64}$'),
 viewer_hash text UNIQUE NOT NULL CHECK (viewer_hash ~ '^[a-f0-9]{64}$'),
 sequence bigint NOT NULL,
 snapshot jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.eumo_dig_streams ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.eumo_dig_streams FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.eumo_dig_streams TO service_role;
CREATE OR REPLACE FUNCTION public.eumo_publish_dig(p_writer text,p_viewer text,p_sequence bigint,p_snapshot jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE changed integer;
BEGIN
 INSERT INTO eumo_dig_streams(writer_hash,viewer_hash,sequence,snapshot)
 VALUES(p_writer,p_viewer,p_sequence,p_snapshot)
 ON CONFLICT(writer_hash) DO UPDATE SET sequence=EXCLUDED.sequence,
 snapshot=EXCLUDED.snapshot, updated_at=now()
 WHERE eumo_dig_streams.sequence<EXCLUDED.sequence AND eumo_dig_streams.viewer_hash=EXCLUDED.viewer_hash;
 GET DIAGNOSTICS changed = ROW_COUNT;
 RETURN changed=1;
END; $$;
REVOKE ALL ON FUNCTION public.eumo_publish_dig(text,text,bigint,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eumo_publish_dig(text,text,bigint,jsonb) TO service_role;
