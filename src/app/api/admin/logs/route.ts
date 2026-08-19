import { getSupabase } from '@/lib/supabase'
import { fetchSessionLogs, parseRoster } from '@/lib/leaderboard'
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