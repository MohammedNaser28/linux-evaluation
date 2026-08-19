'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminData, StudentAggregate } from '@/lib/types'

const REFRESH_MS = 20_000

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AdminData | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(false)
  const tokenRef = useRef<string | null>(null)

  const load = useCallback(async (token: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/submissions', {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.status === 401) {
        tokenRef.current = null
        setAuthed(false)
        setError('Wrong password')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `request failed (${res.status})`)
      }
      const payload: AdminData = await res.json()
      setData(payload)
      tokenRef.current = token
      setAuthed(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) void load(password.trim())
  }

  useEffect(() => {
    if (!autoRefresh || !authed) return
    const t = setInterval(() => {
      if (tokenRef.current) void load(tokenRef.current)
    }, REFRESH_MS)
    return () => clearInterval(t)
  }, [autoRefresh, authed, load])

  if (!authed) {
    return (
      <main>
        <header className="site">
          <h1>Linux evaluation '26 · Admin</h1>
          <span className="badge">restricted</span>
        </header>
        {error && <div className="banner">{error}</div>}
        <form className="admin-login" onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
          />
          <button type="submit" disabled={!password || loading}>
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
        <p className="empty">Enter the admin password to view connectivity.</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main>
        <header className="site">
          <h1>Linux evaluation '26 · Admin</h1>
          <span className="badge">restricted</span>
        </header>
        {error && <div className="banner">{error}</div>}
        <p className="empty">Loading…</p>
      </main>
    )
  }

  const lb = data.leaderboard
  const testLb = data.test_leaderboard
  const byId = new Map<string, StudentAggregate>(lb.students.map((s) => [s.student_id, s]))
  const rows = [...data.roster.map((r) => r.student_id)]
  for (const s of lb.students) if (!rows.includes(s.student_id)) rows.push(s.student_id)
  rows.sort((a, b) => (byId.get(b)?.completed ?? 0) - (byId.get(a)?.completed ?? 0))

  const connectedCount = lb.students.length
  const testCompleted = testLb.students.length

  return (
    <main>
      <header className="site">
        <h1>Linux evaluation '26 · Admin</h1>
        <span className="badge">restricted</span>
      </header>

      {error && <div className="banner">{error}</div>}

      <div className="stats">
        <div className="stat">
          <div className="value">{connectedCount}</div>
          <div className="label">connected</div>
        </div>
        <div className="stat">
          <div className="value">{lb.total_submissions}</div>
          <div className="label">submissions</div>
        </div>
        <div className="stat">
          <div className="value">{data.missing.length}</div>
          <div className="label">not connected</div>
        </div>
        <div className="stat">
          <div className="value">{testCompleted}</div>
          <div className="label">test done</div>
        </div>
        <div className="stat">
          <div className="value">{rows.length}</div>
          <div className="label">students known</div>
        </div>
      </div>

      <section className="card">
        <h2>Connectivity matrix</h2>
        {lb.levels.length === 0 ? (
          <p className="empty">No level data yet.</p>
        ) : (
          <div className="matrix-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th>Student</th>
                  {lb.levels.map((l) => (
                    <th key={l} title={l}>
                      {l.replace(/^challenges\//, '').replace(/^level/, 'L')}
                    </th>
                  ))}
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((id) => {
                  const s = byId.get(id)
                  return (
                    <tr key={id}>
                      <td className="student-id">
                        {id}
                        {data.roster.some((r) => r.student_id === id && !r.connected) && (
                          <span title="expected but no submissions"> ⚠</span>
                        )}
                      </td>
                      {lb.levels.map((l) => (
                        <td key={l}>
                          <span
                            className={`dot ${s && s.levels.includes(l) ? 'on' : 'off'}`}
                            title={
                              s && s.levels.includes(l)
                                ? `${id} completed ${l}`
                                : `${id} has not completed ${l}`
                            }
                          />
                        </td>
                      ))}
                      <td className="completed">{s ? s.completed : 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.missing.length > 0 && (
        <section className="card">
          <h2>Expected but not connected</h2>
          <p className="empty" style={{ textAlign: 'left', padding: 0 }}>
            {data.missing.join(', ')}
          </p>
        </section>
      )}

      <section className="card">
        <h2>Test run (dry-run submissions)</h2>
        {testLb.levels.length === 0 ? (
          <p className="empty">No test submissions yet — students can verify the pipeline by passing any test level from test.enc.</p>
        ) : (
          <div className="matrix-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th>Student</th>
                  {testLb.levels.map((l) => (
                    <th key={l} title={l}>
                      {l.replace(/^challenges\//, '').replace(/^test/, 'T')}
                    </th>
                  ))}
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {testLb.students.map((s) => (
                  <tr key={s.student_id}>
                    <td className="student-id">{s.student_id}</td>
                    {testLb.levels.map((l) => (
                      <td key={l}>
                        <span
                          className={`dot ${s.levels.includes(l) ? 'on' : 'off'}`}
                          title={s.levels.includes(l) ? `${s.student_id} passed ${l}` : `${s.student_id} has not passed ${l}`}
                        />
                      </td>
                    ))}
                    <td className="completed">{s.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="footer">
        <button
          className="secondary"
          onClick={() => tokenRef.current && void load(tokenRef.current)}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh now'}
        </button>{' '}
        <button className="secondary" onClick={() => setAutoRefresh((v) => !v)}>
          Auto-refresh: {autoRefresh ? 'on' : 'off'}
        </button>
        {'  ·  '}last updated {new Date(data.last_updated).toLocaleTimeString()}
      </footer>
    </main>
  )
}