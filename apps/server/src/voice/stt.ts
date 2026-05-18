import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { mulawToPcm } from './audio-utils'
import { env } from '../config/env'

export interface Transcript {
  text: string
  isFinal: boolean
}

const PULSE_URL = 'wss://waves-api.smallest.ai/api/v1/pulse/get_text'

const LANGUAGE_CODE: Record<string, string> = {
  en: 'en',
  'en-IN': 'en',
  hi: 'hi',
}

export class STTService extends EventEmitter {
  private ws: WebSocket | null = null
  private controller: AbortController | null = null

  async start(language: string): Promise<void> {
    const lang = LANGUAGE_CODE[language] ?? 'en'
    this.controller = new AbortController();

    return new Promise((resolve, reject) => {
      // Set a timeout for the WebSocket connection
      const timeout = setTimeout(() => {
        reject(new Error('STT connection timeout after 30 seconds'));
      }, 30000);

      this.ws = new WebSocket(PULSE_URL, {
        headers: { Authorization: `Bearer ${env.SMALLEST_AI_API_KEY}` },
        signal: this.controller.signal
      })

      this.ws.once('open', () => {
        clearTimeout(timeout);
        this.ws!.send(
          JSON.stringify({
            type: 'config',
            language: lang,
            sample_rate: 16000,
            encoding: 'pcm_s16le',
            interim_results: true,
          }),
        )
        resolve()
      })

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as Record<string, unknown>
          const text = (msg['text'] as string | undefined) ?? (msg['transcript'] as string | undefined) ?? ''
          if (text.trim()) {
            const t: Transcript = {
              text: text.trim(),
              isFinal: Boolean(msg['is_final'] ?? msg['isFinal'] ?? true),
            }
            this.emit('transcript', t)
          }
          if (msg['type'] === 'utterance_end') this.emit('utterance_end')
        } catch {
          // ignore parse errors
        }
      })

      this.ws.on('error', (err) => {
        this.emit('error', err)
        clearTimeout(timeout);
        reject(err)
      })

      this.ws.on('close', () => this.emit('close'))
    })
  }

  sendAudio(mulaw: Buffer): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(mulawToPcm(mulaw))
  }

  async stop(): Promise<void> {
    if (!this.ws) return
    if (this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type: 'stop' })) } catch { /* ignore */ }
    }
    if (this.controller) {
      this.controller.abort();
    }
    this.ws.close()
    this.ws = null
    this.controller = null
  }
}
