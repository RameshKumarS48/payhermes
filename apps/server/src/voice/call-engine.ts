import type { CallSession, TranscriptEntry } from './session'
import { updateSession } from './session'

interface Workflow {
  version: 1
  language: string
  voice: { provider: string; voice_id: string; speed?: number }
  persona: { role: string; tone: string; style_notes?: string }
  greeting: string
  questions: WorkflowQuestion[]
  tools: WorkflowTool[]
  closing: string
  fallback: { out_of_scope: string; cannot_understand: string; max_silence_sec: number }
}

interface WorkflowQuestion {
  key: string
  prompt: string
  retry_prompt?: string
  type: 'text' | 'phone' | 'datetime' | 'choice' | 'number' | 'confirmation'
  choices?: string[]
  validation?: { regex?: string; llm_check?: string }
  required: boolean
  skippable_phrase?: string
}

type WorkflowTool =
  | { type: 'google_calendar.book'; config: { calendar_id: string; duration_min: number; buffer_min?: number } }
  | { type: 'webhook'; config: { url: string; method: 'POST'; headers?: Record<string, string> } }
  | { type: 'knowledge_lookup'; config: { collection_id: string } }

const MAX_RETRIES = 2

export class CallEngine {
  constructor(
    private session: CallSession,
    private workflow: Workflow,
  ) {}

  getOpening(): string {
    const q = this.workflow.questions[0]
    if (!q) return this.workflow.greeting
    return `${this.workflow.greeting} ${q.prompt}`
  }

  async handleInput(rawText: string): Promise<{ speak: string; isEnd: boolean }> {
    const session = this.session
    const wf = this.workflow

    this.addTranscript('user', rawText)

    if (session.phase === 'asking') {
      const q = wf.questions[session.questionIndex]
      if (!q) return this.moveToClosing()

      const valid = await this.validate(q, rawText)

      if (valid) {
        this.addTranscript('agent', '')
        updateSession(session.callId, {
          capturedData: { ...session.capturedData, [q.key]: rawText },
          retryCount: 0,
        })
        // Refresh local reference
        session.capturedData[q.key] = rawText
        session.retryCount = 0
        return this.advance()
      }

      // Invalid answer
      if (session.retryCount < MAX_RETRIES) {
        const retryText = q.retry_prompt ?? wf.fallback.cannot_understand
        updateSession(session.callId, { retryCount: session.retryCount + 1 })
        session.retryCount += 1
        this.addTranscript('agent', retryText)
        return { speak: retryText, isEnd: false }
      }

      // Max retries — skip if not required, else use fallback
      if (!q.required) {
        updateSession(session.callId, { retryCount: 0 })
        session.retryCount = 0
        return this.advance()
      }

      const fallback = wf.fallback.out_of_scope
      updateSession(session.callId, { retryCount: 0 })
      return this.advance(fallback)
    }

    // Catch any stray input during other phases
    return { speak: '', isEnd: false }
  }

  private advance(prependText?: string): { speak: string; isEnd: boolean } {
    const session = this.session
    const wf = this.workflow
    const nextIndex = session.questionIndex + 1

    if (nextIndex < wf.questions.length) {
      const nextQ = wf.questions[nextIndex]!
      updateSession(session.callId, { questionIndex: nextIndex })
      session.questionIndex = nextIndex
      const speak = prependText ? `${prependText} ${nextQ.prompt}` : nextQ.prompt
      this.addTranscript('agent', nextQ.prompt)
      return { speak, isEnd: false }
    }

    // All questions done — run tools then close
    updateSession(session.callId, { phase: 'tools' })
    session.phase = 'tools'
    void this.executeTools()

    return this.moveToClosing(prependText)
  }

  private moveToClosing(prependText?: string): { speak: string; isEnd: boolean } {
    const speak = prependText
      ? `${prependText} ${this.workflow.closing}`
      : this.workflow.closing
    updateSession(this.session.callId, { phase: 'closing' })
    this.addTranscript('agent', this.workflow.closing)
    return { speak, isEnd: true }
  }

  private async validate(q: WorkflowQuestion, answer: string): Promise<boolean> {
    if (!answer.trim()) return false

    switch (q.type) {
      case 'text':
        return answer.trim().length > 0

      case 'number': {
        const digits = answer.replace(/[^0-9]/g, '')
        return digits.length > 0
      }

      case 'phone': {
        const cleaned = answer.replace(/[\s\-().+]/g, '')
        if (/^\d{7,15}$/.test(cleaned)) return true
        // E.164 format
        if (/^\+[1-9]\d{6,14}$/.test(answer.trim())) return true
        // User might say digits individually — extract and check
        const digits = answer.replace(/[^0-9]/g, '')
        return digits.length >= 7 && digits.length <= 15
      }

      case 'datetime':
        // Accept any response that looks date/time-like
        return answer.trim().length > 2

      case 'choice': {
        const choices = (q.choices ?? []).map((c) => c.toLowerCase())
        const lower = answer.toLowerCase()
        return choices.some((c) => lower.includes(c))
      }

      case 'confirmation': {
        const lower = answer.toLowerCase()
        const yes = ['yes', 'yeah', 'yep', 'sure', 'correct', 'ok', 'okay', 'right', 'absolutely', 'confirmed', 'confirm']
        const no = ['no', 'nope', 'nah', 'not', 'cancel', 'decline', 'wrong', 'negative']
        return yes.some((w) => lower.includes(w)) || no.some((w) => lower.includes(w))
      }

      default:
        return true
    }
  }

  private async executeTools(): Promise<void> {
    const webhookTool = this.workflow.tools.find((t) => t.type === 'webhook') as
      | Extract<WorkflowTool, { type: 'webhook' }>
      | undefined

    if (webhookTool) {
      try {
        await fetch(webhookTool.config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...webhookTool.config.headers,
          },
          body: JSON.stringify({
            call_id: this.session.callId,
            agent_id: this.session.agentId,
            captured_data: this.session.capturedData,
          }),
        })
      } catch (err) {
        console.error(`[${this.session.callId}] Webhook error:`, err)
      }
    }

    const calendarTool = this.workflow.tools.find((t) => t.type === 'google_calendar.book')
    if (calendarTool) {
      console.log(`[${this.session.callId}] Calendar booking — calendar_id: ${(calendarTool as Extract<WorkflowTool, { type: 'google_calendar.book' }>).config.calendar_id}`)
    }
  }

  private addTranscript(role: 'agent' | 'user', text: string): void {
    const entry: TranscriptEntry = { role, text, ts: new Date().toISOString() }
    this.session.transcript.push(entry)
    updateSession(this.session.callId, { transcript: this.session.transcript })
  }
}
