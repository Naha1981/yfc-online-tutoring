# Database Design

## Implemented MVP persistence

The Mini App has an isolated relational database with a single private `lesson_sessions` table. It stores the latest resumable state for one lesson per learner:

- grade, subject and topic identifiers
- current lesson phase
- tutor/learner message history
- a monotonically increasing client sync version
- database-owned creation and update timestamps

The `owner_id` comes from `auth.user_id()` and is protected by row-level security. A learner can only select, create, update or delete their own session; the client never supplies an owner id. `lesson_key` is unique per owner, allowing `upsert` to keep a single current session.

`src/sessionRepository.ts` writes to browser local storage first, then attempts the private database. When the network or database API is unavailable, it reads and writes only the local snapshot so a lesson remains usable offline. The next ordinary state change retries remote persistence.

## Migrations

- `db/migrations/001_create_lesson_sessions.sql` — table, index and RLS policy
- `db/migrations/002_manage_session_timestamps.sql` — database-managed `updated_at` trigger and immutable ownership/creation values on update

## Future model

When more lesson content is introduced, add normalized curriculum, lesson, lesson-step and event tables. Keep user-generated progress records private with RLS, and do not make curriculum content private unless it contains learner data.
