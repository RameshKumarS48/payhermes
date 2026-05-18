import type { WebSocket } from 'ws'
import { TTSService } from './tts'
import { STTService } from './stt'
import { CallEngine } from './call-engine'
import { getSession, updateSession, deleteSession } from './session'
import { supabase } from '../lib/supabase'

interface TwilioMsg {
  event: string
  streamSid?: string
  start?: { streamSid: string; callSid: string }
  media?: { payload: string }
  mark?: { name: string }
}

export class VoicePipeline {
  private tts = new TTSService()
  private stt = new STTService()
  private engine: CallEngine | null = null
  private streamSid = ''
  private isSpeaking = false
  private markResolvers = new Map<string, () => void>()

  constructor(
    private ws: WebSocket,
    private callId: string,
  ) {}

  async start(): Promise<void> {
    const session = getSession(this.callId)
    if (!session) throw new Error(`Session not found: ${this.callId}`)

    // Load workflow from Supabase
    const { data: agent } = await supabase
      .from('agents')
      .select('workflow')
      .eq('id', session.agentId)
      .single()

    if (!agent?.workflow) throw new Error(`Agent workflow not found: ${session.agentId}`)

    const workflow = agent.workflow as ConstructorParameters<typeof CallEngine>[1]
    this.engine = new CallEngine(session, workflow)

    await this.stt.start(session.language)

    this.stt.on('transcript', (t: { text: string; isFinal: boolean }) => {
      if (!this.isSpeaking && t.isFinal && t.text.trim()) {
        void this.handleUserSpeech(t.text)
      }
    })

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as TwilioMsg
        void this.handleTwilioMsg(msg)
      } catch {
        // ignore malformed frames
      }
    })

    this.ws.on('close', () => void this.cleanup('completed'))
    this.ws.on('error', () => void this.cleanup('failed'))
  }

  private async handleTwilioMsg(msg: TwilioMsg): Promise<void> {
    switch (msg.event) {
      case 'start':
        this.streamSid = msg.start?.streamSid ?? ''
        updateSession(this.callId, { streamSid: this.streamSid })
        await this.startCall()
        break

      case 'media': {
        if (msg.media && !this.isSpeaking) {
          const audio = Buffer.from(msg.media.payload, 'base64')
          this.stt.sendAudio(audio)
        }
        break
      }

      case 'mark': {
        const resolver = this.markResolvers.get(msg.mark?.name ?? '')
        if (resolver) {
          resolver()
          this.markResolvers.delete(msg.mark!.name)
        }
        break
      }

      case 'stop':
        await this.cleanup('completed')
        break
    }
  }

  private async startCall(): Promise<void> {
    const opening = this.engine!.getOpening()
    await this.speak(opening)
    updateSession(this.callId, { phase: 'asking' })
    const session = getSession(this.callId)!
    session.phase = 'asking'
  }

  private async handleUserSpeech(text: string): Promise<void> {
    if (!this.engine) return
    try {
      const { speak, isEnd } = await this.engine.handleInput(text)
      if (speak) await this.speak(speak)
      if (isEnd) {
        setTimeout(() => {
          if (this.ws.readyState === 1 /* OPEN */) this.ws.close()
        }, 2500)
      }
    } catch (err) {
      console.error(`[${this.callId}] handleUserSpeech error:`, err)
    }
  }

  private async speak(text: string): Promise<void> {
    if (!text.trim() || this.ws.readyState !== 1 /* OPEN */) return
    this.isSpeaking = true

    try {
      const session = getSession(this.callId)!
      const audio = await this.tts.synthesize(text, session.voiceId, session.language)
      const chunks = this.tts.toBase64Chunks(audio)

      for (const chunk of chunks) {
        if (this.ws.readyState !== 1) break
        this.ws.send(JSON.stringify({ event: 'media', streamSid: this.streamSid, media: { payload: chunk } }))
      }

      await this.waitForMark()
    } catch (err) {
      console.error(`[${this.callId}] speak error:`, err)
    } finally {
      this.isSpeaking = false
    }
  }

  private waitForMark(): Promise<void> {
    return new Promise((resolve) => {
      const name = `mark-${Date.now()}`;
      const timeout = setTimeout(resolve, 60_000); // Increased from 30s to 60s
      this.markResolvers.set(name, () => {
        clearTimeout(timeout);
        resolve();
      });
      if (this.ws.readyState === 1) {
        this.ws.send(JSON.stringify({ event: 'mark', streamSid: this.streamSid, mark: { name } }));
      } else {
        clearTimeout(timeout);
        this.markResolvers.delete(name);
        resolve();
      }
    });
  }

  private async cleanup(status: 'completed' | 'failed'): Promise<void> {
    const session = getSession(this.callId)
    if (!session) return

    await this.stt.stop().catch(() => {})

    await supabase
      .from('calls')
      .update({
        status,
        transcript: session.transcript,
        captured_data: session.capturedData,
        ended_at: new Date().toISOString(),
      })
      .eq('id', this.callId)

    deleteSession(this.callId)
  }
}
