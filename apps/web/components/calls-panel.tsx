'use client'

import { useState, useEffect, useCallback } from 'react'
import { Phone, PhoneIncoming, PhoneOutgoing, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Call {
  id: string
  direction: 'inbound' | 'outbound'
  status: string
  from_number: string
  to_number: string
  duration_seconds: number | null
  started_at: string
  ended_at: string | null
}

interface Props {
  agentId: string
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  initiated: 'bg-yellow-100 text-yellow-700',
  ringing: 'bg-yellow-100 text-yellow-700',
  busy: 'bg-orange-100 text-orange-700',
  no_answer: 'bg-gray-100 text-gray-600',
}

function fmtDuration(secs: number | null) {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function CallsPanel({ agentId }: Props) {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [toPhone, setToPhone] = useState('')
  const [calling, setCalling] = useState(false)
  const [callError, setCallError] = useState('')

  const fetchCalls = useCallback(async () => {
    const res = await fetch(`/api/calls?agentId=${agentId}`)
    const data = (await res.json()) as { calls?: Call[] }
    setCalls(data.calls ?? [])
    setLoading(false)
  }, [agentId])

  useEffect(() => { void fetchCalls() }, [fetchCalls])

  const handleCall = async () => {
    setCallError('')
    if (!toPhone.trim()) { setCallError('Enter a phone number'); return }
    setCalling(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toPhone: toPhone.trim() }),
      })
      const data = (await res.json()) as { callId?: string; error?: string }
      if (!res.ok) { setCallError(data.error ?? 'Failed'); return }
      setToPhone('')
      setTimeout(() => void fetchCalls(), 3000)
    } catch {
      setCallError('Network error')
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Calls</span>
      </div>

      {/* Outbound trigger */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-2">
          <input
            value={toPhone}
            onChange={(e) => setToPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCall() }}
            placeholder="+1 555 000 0000"
            className="flex-1 text-sm border border-border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <button
            onClick={() => void handleCall()}
            disabled={calling}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded font-medium transition-colors',
              calling ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {calling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
            Call
          </button>
        </div>
        {callError && <p className="text-xs text-destructive mt-1">{callError}</p>}
      </div>

      {/* Call list */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : calls.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No calls yet</p>
        ) : (
          calls.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="text-muted-foreground">
                {c.direction === 'inbound'
                  ? <PhoneIncoming className="h-4 w-4" />
                  : <PhoneOutgoing className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{c.direction === 'inbound' ? c.from_number : c.to_number}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(c.started_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{fmtDuration(c.duration_seconds)}</span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_COLOR[c.status] ?? 'bg-muted text-muted-foreground')}>
                  {c.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
