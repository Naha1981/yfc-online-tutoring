import { PostgrestClient } from '@supabase/postgrest-js'
import { LessonMessage, LessonPhase } from './lessonEngine'
import { Database, LessonSessionRow } from './types/database'

export type LessonIdentity = { lessonKey: string; grade: string; subject: string; topic: string }
export type LessonSnapshot = { phase: LessonPhase; messages: LessonMessage[]; version?: number }
export type SessionRepository = {
  load(identity: LessonIdentity): Promise<LessonSnapshot | null>
  save(identity: LessonIdentity, snapshot: LessonSnapshot): Promise<void>
}

const localSnapshot = (identity: LessonIdentity): LessonSnapshot | null => {
  try {
    const raw = window.localStorage.getItem(identity.lessonKey)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || !value.phase || !Array.isArray(value.messages)) return null
    return { phase: value.phase, messages: value.messages }
  } catch { return null }
}

const saveLocalSnapshot = (identity: LessonIdentity, snapshot: LessonSnapshot) => {
  window.localStorage.setItem(identity.lessonKey, JSON.stringify({ ...snapshot, savedAt: new Date().toISOString() }))
}

function toSnapshot(row: LessonSessionRow): LessonSnapshot {
  return { phase: row.phase, messages: Array.isArray(row.messages) ? row.messages as LessonMessage[] : [], version: row.version }
}

function databaseClient() {
  if (!window.moxt?.db?.fetch) return null
  return new PostgrestClient<Database>('http://localhost', { fetch: window.moxt.db.fetch })
}

/** Saves locally first. Remote persistence is best-effort so learners can continue offline. */
export function createSessionRepository(): SessionRepository {
  const client = databaseClient()
  return {
    async load(identity) {
      const fallback = localSnapshot(identity)
      if (!client) return fallback
      try {
        const { data, error } = await client.from('lesson_sessions').select('*').eq('lesson_key', identity.lessonKey).maybeSingle()
        if (error) throw error
        if (!data) return fallback
        const remote = toSnapshot(data)
        saveLocalSnapshot(identity, remote)
        return remote
      } catch {
        return fallback
      }
    },
    async save(identity, snapshot) {
      saveLocalSnapshot(identity, snapshot)
      if (!client) return
      try {
        const { error } = await client.from('lesson_sessions').upsert({
          lesson_key: identity.lessonKey,
          grade: identity.grade,
          subject: identity.subject,
          topic: identity.topic,
          phase: snapshot.phase,
          messages: snapshot.messages,
          version: (snapshot.version || 0) + 1,
        }, { onConflict: 'owner_id,lesson_key' })
        if (error) throw error
      } catch {
        // The local copy remains the durable offline fallback. A later state change retries remote persistence.
      }
    },
  }
}
