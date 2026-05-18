import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const { data: calls } = await supabase
    .from('calls')
    .select('id, direction, status, from_number, to_number, duration_seconds, started_at, ended_at')
    .eq('agent_id', agentId)
    .order('started_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ calls: calls ?? [] })
}
