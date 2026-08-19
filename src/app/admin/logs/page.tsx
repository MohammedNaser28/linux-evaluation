'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LogsData } from '@/lib/types'

const REFRESH_MS = 20_000

export default function LogsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LogsData | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(false)
  const tokenRef = useRef<string | null>(null)

  const load = useCallback(async (token: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/logs', {
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
      setData((await res.json()) as LogsData)
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
          <h1>Linux evaluation '26 · Logs</h1>
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
        <p className="empty">Enter the admin password to view attendance logs.</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main>
        <header className="site">
          <h1>Linux evaluation '26 · Logs</h1>
          <span className="badge">restricted</span>
        </header>
        {error && <div className="banner">{error}</div>}
        <p className="empty">Loading…</p>
      </main>
    )
  }

  const entered = new Set(data.entries.map((e) => e.student_id))
  const rosterIds = new Set(data.roster.map((r) => r.student_id))
  const lastEntry = (id: string) => {
    const mine = data.entries.filter((e) => e.student_id === id)
    return mine.length ? mine[mine.length - 1] : null
  }
  const rows = [
    ...data.roster.map((r) => r.student_id),
    ...data.entries.map((e) => e.student_id).filter((id) => !rosterIds.has(id)),
  ]
  const rowsSorted = [...new Set(rows)].sort()

  return (
    <main>
      <header className="site">
        <h1>Linux evaluation '26 · Logs</h1>
        <span className="badge">restricted</span>
      </header>

      {error && <div className="banner">{error}</div>}

      <div className="stats">
        <div className="stat">
          <div className="value">{rowsSorted.length}</div>
          <div className="label">students known</div>
        </div>
        <div className="stat">
          <div className="value">{entered.size}</div>
          <div className="label">entered</div>
        </div>
        <div className="stat">
          <div className="value">{data.not_entered.length}</div>
          <div className="label">not entered</div>
        </div>
        <div className="stat">
          <div className="value">{data.entries.length}</div>
          <div className="label">sessions</div>
        </div>
      </div>

      <section className="card">
        <h2>Who entered</h2>
        {rowsSorted.length === 0 ? (
          <p className="empty">No students yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Entered</th>
                <th>First / last session</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rowsSorted.map((id) => {
                const last = lastEntry(id)
                const first = data.entries.find((e) => e.student_id === id)
                const inRoster = data.roster.some((r) => r.student_id === id)
                return (
                  <tr key={id}>
                    <td className="student-id">
                      {id}
                      {!inRoster && <span title="not in EXPECTED_STUDENTS roster"> *</span>}
                    </td>
                    <td>
                      <span className={`dot ${entered.has(id) ? 'on' : 'off'}`} />{' '}
                      {entered.has(id) ? 'yes' : 'no'}
                    </td>
                    <td className="time">
                      {first ? `${new Date(first.entered_at).toLocaleString()}` : '—'}
                      {last && last.entered_at !== first?.entered_at
                        ? ` / ${new Date(last.entered_at).toLocaleString()}`
                        : ''}
                    </td>
                    <td className="time">{last?.source ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {data.not_entered.length > 0 && (
        <section className="card">
          <h2>Expected but did not enter</h2>
          <p className="empty" style={{ textAlign: 'left', padding: 0 }}>
            {data.not_entered.join(', ')}
          </p>
        </section>
      )}

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