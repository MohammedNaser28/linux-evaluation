export interface Submission {
  student_id: string
  question_id: string
  flag?: string | null
  created_at?: string | null
}

export interface StudentAggregate {
  student_id: string
  completed: number
  levels: string[]
  last_submitted: string | null
}

export interface Leaderboard {
  students: StudentAggregate[]
  levels: string[]
  total_levels: number
  total_submissions: number
}

export interface RosterStatus {
  student_id: string
  connected: boolean
  completed: number
}

export interface AdminLevelState {
  question_id: string
  flag: string | null
  created_at: string | null
}

export interface AdminData {
  leaderboard: Leaderboard
  roster: RosterStatus[]
  missing: string[]
  test_leaderboard: Leaderboard
  last_updated: string
}

export interface SessionLogEntry {
  student_id: string
  source: string
  entered_at: string
}

export interface LogsData {
  roster: RosterStatus[]
  entries: SessionLogEntry[]
  not_entered: string[]
  last_updated: string
}