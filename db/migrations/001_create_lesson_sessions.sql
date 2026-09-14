CREATE TABLE IF NOT EXISTS lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL DEFAULT (auth.user_id()),
  lesson_key TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'welcome' CHECK (phase IN ('welcome', 'teaching', 'check', 'remediation', 'practice', 'complete')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, lesson_key)
);

CREATE INDEX IF NOT EXISTS lesson_sessions_owner_lesson_idx
  ON lesson_sessions (owner_id, lesson_key);

ALTER TABLE lesson_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_sessions_owner_access ON lesson_sessions
  FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = owner_id)
  WITH CHECK ((SELECT auth.user_id()) = owner_id);
