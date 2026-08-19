# Linux evaluation '26

Public leaderboard + admin connectivity dashboard for the QO2 CTF, backed by the same
Supabase project the sandbox writes submissions to.

## Pages

| Route | Access | What it shows |
| --- | --- | --- |
| `/` | Public | Ranked leaderboard — students sorted by completed levels, with progress bars and last-submission time. |
| `/admin` | Password-protected | Connectivity matrix — every student × every level (done/not done), plus a list of expected students who haven't connected. Also shows the dry-run `test_submissions` matrix. |
| `/admin/logs` | Password-protected | Attendance — who started a sandbox session (`session_logs`), when, and from which source (`eval`/`test`), plus who is expected but hasn't entered yet. |
| `/api/admin/submissions` | Bearer token | JSON backing the admin page (`leaderboard`, `roster`, `missing`, `test_leaderboard`). |
| `/api/admin/logs` | Bearer token | JSON backing the logs page (`entries`, `roster`, `not_entered`). |

## How it works

- The qo2 sandbox (`qo start`) inserts `{student_id, question_id, flag}` on every passed
  level and a row into `session_logs` when the session starts (see
  `pkg/database/supabase.go` in the qo2 repo). Both are best-effort sends that never
  block or crash the sandbox.
- `qo start -m eval` writes submissions to `submissions` and logs `source=eval`;
  `qo start -m test` (practice runs with `test.enc`) writes to `test_submissions` and
  logs `source=test`. Practice data **never** lands in the final-day table.
- This app reads those tables with the **service role key, server-side only** — the key never
  reaches the browser. The public leaderboard exposes counts only; flags stay out of the
  public response and are shown only behind the admin password.
- The admin pages derive "not connected" / "did not enter" from `EXPECTED_STUDENTS`
  (your roster) vs. the students actually present in `submissions` / `session_logs`.
- The public page uses ISR (`revalidate = 10`); the admin pages poll the API every 20s.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project details
npm run dev
```

Open http://localhost:3000 for the leaderboard and http://localhost:3000/admin for the
admin view.

## Environment variables

| Variable | Where | Required | Notes |
| --- | --- | --- | --- |
| `SUPABASE_URL` | server | yes | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | server | yes | Server-only. Never expose publicly. |
| `EXPECTED_STUDENTS` | server | no | Comma-separated student IDs for the "not connected" list. |
| `TOTAL_LEVELS` | server | no | Fixed level count. Defaults to distinct levels found. |
| `ADMIN_TOKEN` | server | yes | Password protecting `/admin`. Empty disables the API. |

## Database

Reference schema in `supabase/schema.sql` (tables: `users`, `sessions`, `questions`,
`submissions`, `test_submissions`, `session_logs`). The `submissions`, `test_submissions`,
and `session_logs` tables must exist in your project. Indexes on `student_id` and
`question_id` are recommended.

## Deploying

### Vercel (recommended)

1. Push this repo to GitHub and import it into Vercel.
2. Add the environment variables from above (server-only for the keys).
3. Deploy. The Next.js App Router is supported natively — no config needed.

### Netlify

`netlify.toml` is included (build: `next build`, publish: `.next`, with the Next.js
plugin). Add the same environment variables and deploy.

## Security notes

- The service role key is used only in server components / serverless functions.
- The admin API is gated by `ADMIN_TOKEN` (bearer). Change it before going live.
- RLS is enabled on `submissions`; reads here bypass it via the service role. If you
  later let browsers query Supabase directly with the anon key, add a proper RLS policy.