import { getSupabase } from '@/lib/supabase'
import {
  aggregateSubmissions,
  fetchSubmissions,
  fetchTestSubmissions,
  parseRoster,
  totalLevelsFromEnv,
} from '@/lib/leaderboard'
import type { AdminData, RosterStatus } from '@/lib/types'

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
    const rows = await fetchSubmissions(sb, true)
    const leaderboard = aggregateSubmissions(rows, totalLevelsFromEnv())

    const testRows = await fetchTestSubmissions(sb)
    const testLeaderboard = aggregateSubmissions(testRows, null)

    const connected = new Set(leaderboard.students.map((s) => s.student_id))
    const rosterAll = parseRoster()

    const roster: RosterStatus[] = rosterAll.map((id) => ({
      student_id: id,
      connected: connected.has(id),
      completed: leaderboard.students.find((s) => s.student_id === id)?.completed ?? 0,
    }))

    const missing = rosterAll.filter((id) => !connected.has(id))

    const data: AdminData = {
      leaderboard,
      roster,
      missing,
      test_leaderboard: testLeaderboard,
      last_updated: new Date().toISOString(),
    }

    return json(data, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'failed to load data' }, 500)
  }
}