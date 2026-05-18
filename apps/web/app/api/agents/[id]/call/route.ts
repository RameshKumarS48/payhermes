import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the agent belongs to this user
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', params.id)
    .single()

  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { toPhone } = (await request.json()) as { toPhone: string }
  if (!toPhone) return NextResponse.json({ error: 'toPhone required' }, { status: 400 })

  const serverUrl = process.env['SERVER_BASE_URL']
  if (!serverUrl) return NextResponse.json({ error: 'Voice server not configured' }, { status: 503 })

  const res = await fetch(`${serverUrl}/api/voice/outbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: params.id, toPhone }),
  })

  const data = (await res.json()) as { callId?: string; error?: string }
  if (!res.ok) return NextResponse.json({ error: data.error ?? 'Server error' }, { status: res.status })
  return NextResponse.json(data)
}
