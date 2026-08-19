'use client'

import type { Leaderboard } from '@/lib/types'

function medal(rank: number): string {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}

export default function LeaderboardView({
  leaderboard,
  error,
  mode,
}: {
  leaderboard: Leaderboard | null
  error: string | null
  mode: 'test' | 'eval'
}) {
  if (error) {
    return (
      <main>
        <header className="site">
          <h1>Linux evaluation '26</h1>
          <span className="badge">offline</span>
        </header>
        <div className="banner">Could not load leaderboard: {error}</div>
        <p className="empty">
          Check that <code>SUPABASE_URL</code> and{' '}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> are set on the server.
        </p>
      </main>
    )
  }

  if (!leaderboard || leaderboard.students.length === 0) {
    return (
      <main>
        <header className="site">
          <h1>Linux evaluation '26</h1>
          <span className="badge">live</span>
        </header>
        <div className="empty">No submissions yet — be the first to finish a level.</div>
      </main>
    )
  }

  const total = leaderboard.total_levels
  const done = leaderboard.students.filter((s) => s.completed >= total).length

  return (
    <main>
      <header className="site">
        <h1>Linux evaluation '26</h1>
        {mode === 'test' ? <span className="badge">practice</span> : <span className="badge">live</span>}
      </header>

      <div className="stats">
        <div className="stat">
          <div className="value">{leaderboard.students.length}</div>
          <div className="label">students</div>
        </div>
        <div className="stat">
          <div className="value">{leaderboard.total_submissions}</div>
          <div className="label">submissions</div>
        </div>
        <div className="stat">
          <div className="value">{leaderboard.levels.length}</div>
          <div className="label">levels</div>
        </div>
        <div className="stat">
          <div className="value">{done}</div>
          <div className="label">finished all</div>
        </div>
      </div>

      <section className="card">
        <h2>Rankings</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student</th>
              <th>Levels</th>
              <th>Progress</th>
              <th>Last submission</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.students.map((s, i) => (
              <tr key={s.student_id}>
                <td className={`rank ${medal(i + 1)}`}>{i + 1}</td>
                <td className="student-id">{s.student_id}</td>
                <td className="completed">
                  {s.completed}/{total}
                </td>
                <td>
                  <div className="bar">
                    <span style={{ width: `${Math.round((s.completed / total) * 100)}%` }} />
                  </div>
                </td>
                <td className="time">
                  {s.last_submitted ? new Date(s.last_submitted).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">
        Linux evaluation '26{mode === 'test' ? ' · practice data (test_submissions)' : ' · live data'} · refreshes automatically
      </footer>
    </main>
  )
}