import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NewAgentPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center">
          <div className="text-xl font-bold">PayHermes</div>
        </div>
      </header>
      <main className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Build your agent</h1>
        <p className="text-muted-foreground mb-8">
          The workflow builder is coming in Phase 1.
        </p>
        <Link
          href="/agents"
          className={cn(buttonVariants({ variant: 'ghost' }))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to agents
        </Link>
      </main>
    </div>
  )
}
