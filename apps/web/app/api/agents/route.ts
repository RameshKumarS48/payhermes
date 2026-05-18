import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type Workflow } from '@/lib/workflow-schema'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!org) return NextResponse.json({ agents: [] })

  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, status, voice_id, created_at, updated_at')
    .eq('org_id', org.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: agents ?? [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { name: string; workflow: Workflow; voice_id?: string }

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      org_id: org.id,
      name: body.name,
      workflow: body.workflow,
      voice_id: body.voice_id ?? body.workflow.voice.voice_id,
    })
    .select('id, name, status, voice_id, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agent }, { status: 201 })
}
