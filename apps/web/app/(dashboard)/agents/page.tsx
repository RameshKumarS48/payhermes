import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Bot, Plus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/sign-out-button'

export default async function AgentsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

      <main className="container py-16">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="rounded-full bg-muted p-6 mb-6">
            <Bot className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">No agents yet</h1>
          <p className="text-muted-foreground mb-8">
            Build your first voice agent in minutes — no code required.
          </p>
          <Link
            href="/agents/new"
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            <Plus className="mr-2 h-5 w-5" />
            Create your first agent
          </Link>
        </div>
      </main>
    </div>
  )
}
