import type { SupabaseClient } from '@supabase/supabase-js'
import type { Leaderboard, Submission } from './types'

export function parseRoster(env: string | undefined = process.env.EXPECTED_STUDENTS): string[] {
  if (!env) return []
  return env
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function totalLevelsFromEnv(): number | null {
  const raw = process.env.TOTAL_LEVELS
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Fetches every row in `submissions`. Tries to include `created_at`;
 * if the column doesn't exist it falls back to a narrower select.
 */
export async function fetchSubmissions(
  sb: SupabaseClient,
  withDetails: boolean,
): Promise<Submission[]> {
  const cols = withDetails
    ? 'student_id,question_id,flag,created_at'
    : 'student_id,question_id,created_at'

  let { data, error } = (await sb.from('submissions').select(cols)) as {
    data: Submission[] | null
    error: { message: string } | null
  }

  if (error) {
    const fallback = withDetails ? 'student_id,question_id,flag' : 'student_id,question_id'
    const retry = (await sb.from('submissions').select(fallback)) as {
      data: Submission[] | null
      error: { message: string } | null
    }
    if (retry.error) {
      throw new Error(`submissions query failed: ${retry.error.message}`)
    }
    data = retry.data
  }

return data ?? []
}

/**
 * Fetches every entry-log row (who entered the sandbox). Missing table is
 * treated as empty so the logs page never crashes before the schema exists.
 */
export async function fetchSessionLogs(sb: SupabaseClient) {
  const { data, error } = (await sb
    .from('session_logs')
    .select('student_id,source,entered_at')
    .order('entered_at', { ascending: true })) as {
    data: { student_id: string; source: string; entered_at: string | null }[] | null
    error: { message: string } | null
  }
  if (error) return []
  return (data ?? []).map((r) => ({
    student_id: r.student_id,
    source: r.source ?? 'eval',
    entered_at: r.entered_at ?? '',
  }))
}

/**
 * Fetches the dry-run test submissions (test_submissions table). Test levels are
 * keyed test1..test10, so they never mix with the real leaderboard.
 */
export function aggregateSubmissions(rows: Submission[], totalLevels: number | null): Leaderboard {
  const byStudent = new Map<string, { levels: Set<string>; last: string | null }>()
  const levels = new Set<string>()
  let valid = 0

  for (const r of rows) {
    if (!r.student_id || !r.question_id) continue
    valid++
    levels.add(r.question_id)

    let agg = byStudent.get(r.student_id)
    if (!agg) {
      agg = { levels: new Set(), last: null }
      byStudent.set(r.student_id, agg)
    }
    agg.levels.add(r.question_id)
    if (r.created_at && (!agg.last || r.created_at > agg.last)) {
      agg.last = r.created_at
    }
  }

  const students = [...byStudent.entries()].map(([id, a]) => ({
    student_id: id,
    completed: a.levels.size,
    levels: [...a.levels].sort(),
    last_submitted: a.last,
  }))

  students.sort(
    (x, y) =>
      y.completed - x.completed ||
      (x.last_submitted ?? '').localeCompare(y.last_submitted ?? '') ||
      x.student_id.localeCompare(y.student_id),
  )

  return {
    students,
    levels: [...levels].sort(),
    total_levels: totalLevels ?? levels.size,
    total_submissions: valid,
  }
}

export async function loadLeaderboard(sb: SupabaseClient): Promise<Leaderboard> {
  const rows = await fetchSubmissions(sb, false)
  return aggregateSubmissions(rows, totalLevelsFromEnv())
}

/**
 * Loads the PUBLIC leaderboard. Before the final day, the instructor sets
 * LEADERBOARD_SOURCE=test so the page shows the practice (test_submissions)
 * data instead of the real submissions table; the real table stays empty until
 * the event. Defaults to the real submissions table.
 */
export async function loadPublicLeaderboard(sb: SupabaseClient): Promise<Leaderboard> {
  if (process.env.LEADERBOARD_SOURCE === 'test') {
    const rows = await fetchTestSubmissions(sb)
    return aggregateSubmissions(rows, totalLevelsFromEnv())
  }
  return loadLeaderboard(sb)
}

export function publicMode(): 'test' | 'eval' {
  return process.env.LEADERBOARD_SOURCE === 'test' ? 'test' : 'eval'
}

/**
 * Fetches the dry-run test submissions (test_submissions table). Test levels are
 * keyed test1..test10, so they never mix with the real leaderboard.
 */
export async function fetchTestSubmissions(sb: SupabaseClient): Promise<Submission[]> {
  const cols = 'student_id,question_id,created_at'
  let { data, error } = (await sb.from('test_submissions').select(cols)) as {
    data: Submission[] | null
    error: { message: string } | null
  }

  if (error) {
    const retry = (await sb.from('test_submissions').select('student_id,question_id')) as {
      data: Submission[] | null
      error: { message: string } | null
    }
    if (retry.error) {
      // The test table may not exist yet; treat it as empty rather than failing
      // the whole admin page.
      return []
    }
    data = retry.data
  }

  return data ?? []
}