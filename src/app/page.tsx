import { getSupabase } from '@/lib/supabase'
import { loadLeaderboard } from '@/lib/leaderboard'
import LeaderboardView from '@/components/LeaderboardView'

export const revalidate = 10

export default async function HomePage() {
  try {
    const leaderboard = await loadLeaderboard(getSupabase())
    return <LeaderboardView leaderboard={leaderboard} error={null} />
  } catch (err) {
    return (
      <LeaderboardView
        leaderboard={null}
        error={err instanceof Error ? err.message : 'failed to load leaderboard'}
      />
    )
  }
}