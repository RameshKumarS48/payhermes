import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Bot, Plus, Mic } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/sign-out-button'

interface Agent {
  id: string
  name: string
  status: string
  voice_id: string
  updated_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AgentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  const { data: agents } = org
    ? await supabase
        .from('agents')
        .select('id, name, status, voice_id, updated_at')
        .eq('org_id', org.id)
        .order('updated_at', { ascending: false })
    : { data: [] }

  const agentList: Agent[] = agents ?? []

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-xl font-bold">PayHermes</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Agents</h1>
          <Link href="/agents/new" className={cn(buttonVariants())}>
            <Plus className="mr-2 h-4 w-4" />
            New agent
          </Link>
        </div>

        {agentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-20">
            <div className="rounded-full bg-muted p-6 mb-6">
              <Bot className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
            <p className="text-muted-foreground mb-8">
              Build your first voice agent in minutes — no code required.
            </p>
            <Link href="/agents/new" className={cn(buttonVariants({ size: 'lg' }))}>
              <Plus className="mr-2 h-5 w-5" />
              Create your first agent
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agentList.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group rounded-xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Mic className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      agent.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {agent.status}
                  </span>
                </div>
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {agent.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {formatDate(agent.updated_at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
