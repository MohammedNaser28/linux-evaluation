import { getSupabase } from '@/lib/supabase'
import {
  fetchSessionLogs,
  fetchSubmissions,
  fetchTestSubmissions,
  parseRoster,
} from '@/lib/leaderboard'
import type { LogsData, RosterStatus } from '@/lib/types'

export const runtime = 'nodejs'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export async function GET(req: Request) {
  const token = process.env.ADMIN_TOKEN
  const auth = req.headers.get('authorization') ?? ''
  if (!token || auth !== `Bearer ${token}`) {
    return json({ error: 'unauthorized' }, 401)
  }

  try {
    const sb = getSupabase()
    const entries = await fetchSessionLogs(sb)
    const rosterAll = parseRoster()

    // Anyone who submitted a flag clearly entered, even if the best-effort
    // session_logs insert failed at session start (e.g. a transient network
    // error on the student's machine). Merge synthetic entries for them so the
    // attendance page doesn't lose students whose submission succeeded.
    const logged = new Set(entries.map((e) => e.student_id))
    const [subs, testSubs] = await Promise.all([
      fetchSubmissions(sb, false),
      fetchTestSubmissions(sb),
    ])
    const byStudent = new Map<string, { source: string; first: string | null }>()
    for (const r of [...subs, ...testSubs]) {
      const cur = byStudent.get(r.student_id)
      if (!cur) {
        byStudent.set(r.student_id, {
          source: r.question_id.startsWith('test') ? 'test' : 'eval',
          first: r.created_at ?? null,
        })
      } else if (r.created_at && (!cur.first || r.created_at < cur.first)) {
        cur.first = r.created_at
      }
    }
    for (const [id, meta] of byStudent) {
      if (!logged.has(id)) {
        entries.push({
          student_id: id,
          source: meta.source,
          entered_at: meta.first ?? '',
        })
      }
    }

    const entered = new Set(entries.map((e) => e.student_id))
    const roster: RosterStatus[] = rosterAll.map((id) => ({
      student_id: id,
      connected: entered.has(id),
      completed: 0,
    }))

    const not_entered = rosterAll.filter((id) => !entered.has(id))

    const data: LogsData = {
      roster,
      entries,
      not_entered,
      last_updated: new Date().toISOString(),
    }

    return json(data, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'failed to load data' }, 500)
  }
}