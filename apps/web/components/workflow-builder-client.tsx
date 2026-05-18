'use client'

import { type ReactNode, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Save, Loader2, Bot, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkflowCards } from '@/components/workflow-cards'
import { type Workflow } from '@/lib/workflow-schema'

interface Message {
  role: 'user' | 'assistant'
  content: string
  display?: string
}

interface Props {
  initialWorkflow?: Workflow
  initialMessages?: Message[]
  agentId?: string
  agentName?: string
  phoneNumber?: string
  callsPanel?: ReactNode
}

export function WorkflowBuilderClient({
  initialWorkflow,
  initialMessages,
  agentId: initialAgentId,
  agentName: initialAgentName,
  phoneNumber: initialPhoneNumber = '',
  callsPanel,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [workflow, setWorkflow] = useState<Workflow | null>(initialWorkflow ?? null)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [agentId, setAgentId] = useState<string | undefined>(initialAgentId)
  const [agentName, setAgentName] = useState(initialAgentName ?? '')
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return

      const userMessage: Message = { role: 'user', content: text.trim() }
      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)
      setInput('')
      setIsSending(true)

      try {
        const res = await fetch('/api/workflow-builder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            currentWorkflow: workflow,
          }),
        })

        const data = (await res.json()) as { workflow?: Workflow; error?: string }

        if (!res.ok || !data.workflow) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: data.error ?? 'Something went wrong. Please try again.',
              display: data.error ?? 'Something went wrong. Please try again.',
            },
          ])
          return
        }

        const newWorkflow = data.workflow
        const qCount = newWorkflow.questions.length
        const summary = workflow
          ? `Updated workflow — ${qCount} question${qCount !== 1 ? 's' : ''}. Edit the cards on the right.`
          : `Created a ${qCount}-question agent. Edit the cards on the right, then save.`

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: JSON.stringify(newWorkflow), display: summary },
        ])
        setWorkflow(newWorkflow)
        if (!agentName && newWorkflow.persona.role) {
          setAgentName(newWorkflow.persona.role.slice(0, 50))
        }
        setIsDirty(true)
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Network error. Please try again.', display: 'Network error. Please try again.' },
        ])
      } finally {
        setIsSending(false)
        textareaRef.current?.focus()
      }
    },
    [messages, workflow, agentName, isSending]
  )

  const handleWorkflowChange = useCallback((w: Workflow) => {
    setWorkflow(w)
    setIsDirty(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!workflow) return
    setIsSaving(true)
    try {
      const name = agentName.trim() || workflow.persona.role || 'Untitled agent'
      const body = { name, workflow, phone_number: phoneNumber.trim() || null }

      const res = agentId
        ? await fetch(`/api/agents/${agentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      const data = (await res.json()) as { agent?: { id: string }; error?: string }
      if (!res.ok || !data.agent) {
        alert(data.error ?? 'Save failed')
        return
      }

      setIsDirty(false)
      if (!agentId) {
        setAgentId(data.agent.id)
        router.push(`/agents/${data.agent.id}`)
      }
    } finally {
      setIsSaving(false)
    }
  }, [workflow, agentId, agentName, router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border flex items-center justify-between px-6 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <a href="/agents" className="text-sm text-muted-foreground hover:text-foreground">
            ← Agents
          </a>
          <span className="text-muted-foreground">/</span>
          <input
            value={agentName}
            onChange={(e) => { setAgentName(e.target.value); setIsDirty(true) }}
            placeholder="Agent name"
            className="text-sm font-medium bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-48"
          />
          {agentId && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <input
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value); setIsDirty(true) }}
                placeholder="Phone number (e.g. +1 555…)"
                className="text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-muted-foreground w-52"
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={!workflow || isSaving}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors',
              workflow && !isSaving
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left — Chat */}
        <div className="flex flex-col w-[420px] shrink-0 border-r border-border">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
                <Sparkles className="h-8 w-8" />
                <p className="text-sm max-w-[260px]">
                  Describe your voice agent in plain English and I'll build the workflow.
                </p>
                <div className="text-xs space-y-1 text-left">
                  <p className="text-muted-foreground/70">Try:</p>
                  {[
                    '"Qualify leads who fill my contact form"',
                    '"Confirm patient appointments"',
                    '"Book yoga classes over the phone"',
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => void sendMessage(ex.replace(/"/g, ''))}
                      className="block text-xs text-primary hover:underline text-left"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[300px] rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  )}
                >
                  {m.display ?? m.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe or edit your agent…"
                rows={2}
                className="flex-1 resize-none text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <button
                onClick={() => void sendMessage(input)}
                disabled={!input.trim() || isSending}
                className={cn(
                  'rounded-xl p-2.5 transition-colors',
                  input.trim() && !isSending
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 px-1">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Right — Workflow cards + calls */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {callsPanel}
          {workflow ? (
            <WorkflowCards workflow={workflow} onChange={handleWorkflowChange} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
              <Bot className="h-12 w-12" />
              <p className="text-sm">Your workflow will appear here after you describe your agent.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
