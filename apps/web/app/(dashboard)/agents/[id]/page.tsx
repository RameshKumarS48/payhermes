import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkflowBuilderClient } from '@/components/workflow-builder-client'
import { CallsPanel } from '@/components/calls-panel'
import { WorkflowSchema } from '@/lib/workflow-schema'

export default async function AgentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, workflow, phone_number')
    .eq('id', params.id)
    .single()

  if (!agent) notFound()

  const parsed = WorkflowSchema.safeParse(agent.workflow)
  if (!parsed.success) notFound()

  return (
    <WorkflowBuilderClient
      agentId={agent.id}
      agentName={agent.name}
      phoneNumber={agent.phone_number ?? ''}
      initialWorkflow={parsed.data}
      initialMessages={[
        {
          role: 'assistant',
          content: JSON.stringify(parsed.data),
          display: `Loaded "${agent.name}" — ${parsed.data.questions.length} questions. Edit the cards or type to make changes.`,
        },
      ]}
      callsPanel={<CallsPanel agentId={agent.id} />}
    />
  )
}
