export interface TranscriptEntry {
  role: 'agent' | 'user'
  text: string
  ts: string
}

export interface CallSession {
  callId: string
  agentId: string
  voiceId: string
  language: string
  phase: 'greeting' | 'asking' | 'tools' | 'closing' | 'done'
  questionIndex: number
  retryCount: number
  capturedData: Record<string, string>
  transcript: TranscriptEntry[]
  streamSid: string
}

const sessions = new Map<string, CallSession>()

export function createSession(data: Omit<CallSession, 'phase' | 'questionIndex' | 'retryCount' | 'capturedData' | 'transcript' | 'streamSid'>): CallSession {
  const session: CallSession = {
    ...data,
    phase: 'greeting',
    questionIndex: 0,
    retryCount: 0,
    capturedData: {},
    transcript: [],
    streamSid: '',
  }
  sessions.set(data.callId, session)
  return session
}

export function getSession(callId: string): CallSession | undefined {
  return sessions.get(callId)
}

export function updateSession(callId: string, patch: Partial<CallSession>): void {
  const s = sessions.get(callId)
  if (s) sessions.set(callId, { ...s, ...patch })
}

export function deleteSession(callId: string): void {
  sessions.delete(callId)
}
