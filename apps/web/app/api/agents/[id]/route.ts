import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type Workflow } from '@/lib/workflow-schema'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, name, status, voice_id, workflow, created_at, updated_at')
    .eq('id', params.id)
    .single()

  if (error || !agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ agent })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { name?: string; workflow?: Workflow; voice_id?: string; phone_number?: string | null }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates['name'] = body.name
  if (body.workflow !== undefined) {
    updates['workflow'] = body.workflow
    updates['voice_id'] = body.voice_id ?? body.workflow.voice.voice_id
  }
  if (body.phone_number !== undefined) updates['phone_number'] = body.phone_number ?? null

  const { data: agent, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, status, voice_id, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agent })
}
