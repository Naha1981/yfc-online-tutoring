export interface Database {
  public: {
    Tables: {
      lesson_sessions: {
        Row: {
          id: string
          owner_id: string
          lesson_key: string
          grade: string
          subject: string
          topic: string
          phase: 'welcome' | 'teaching' | 'check' | 'remediation' | 'practice' | 'complete'
          messages: unknown
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string
          lesson_key: string
          grade: string
          subject: string
          topic: string
          phase?: 'welcome' | 'teaching' | 'check' | 'remediation' | 'practice' | 'complete'
          messages?: unknown
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          phase?: 'welcome' | 'teaching' | 'check' | 'remediation' | 'practice' | 'complete'
          messages?: unknown
          version?: number
          updated_at?: string
        }
      }
    }
  }
}

export type LessonSessionRow = Database['public']['Tables']['lesson_sessions']['Row']
