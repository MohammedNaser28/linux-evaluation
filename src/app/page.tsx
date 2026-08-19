import { getSupabase } from '@/lib/supabase'
import { loadPublicLeaderboard, publicMode } from '@/lib/leaderboard'
import LeaderboardView from '@/components/LeaderboardView'

export const revalidate = 10

export default async function HomePage() {
  try {
    const leaderboard = await loadPublicLeaderboard(getSupabase())
    return <LeaderboardView leaderboard={leaderboard} error={null} mode={publicMode()} />
  } catch (err) {
    return (
      <LeaderboardView
        leaderboard={null}
        error={err instanceof Error ? err.message : 'failed to load leaderboard'}
        mode={publicMode()}
      />
    )
  }
}