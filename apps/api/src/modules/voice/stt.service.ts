import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { EventEmitter } from 'events';
import { env } from '../../config/env';

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  language?: string;
}

export class STTService extends EventEmitter {
  private connection: any = null;
  private deepgram: any;

  constructor() {
    super();
    this.deepgram = createClient(env.DEEPGRAM_API_KEY);
  }

  async start(language: string = 'en-US'): Promise<void> {
    const model = language === 'hi-IN' ? 'nova-2' : 'nova-2';
    const lang = language === 'hinglish' ? 'hi' : language.split('-')[0];

    this.connection = this.deepgram.listen.live({
      model,
      language: lang,
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1500,
      vad_events: true,
      encoding: 'mulaw',
      sample_rate: 8000,
      channels: 1,
    });

    this.connection.on(LiveTranscriptionEvents.Open, () => {
      this.emit('open');
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0];
      if (transcript && transcript.transcript) {
        const result: TranscriptResult = {
          text: transcript.transcript,
          isFinal: data.is_final,
          confidence: transcript.confidence,
          language: data.channel?.detected_language,
        };
        this.emit('transcript', result);
      }
    });

    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      this.emit('utterance_end');
    });

    this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      this.emit('error', error);
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      this.emit('close');
    });
  }

  sendAudio(audioBuffer: Buffer): void {
    if (this.connection) {
      this.connection.send(audioBuffer);
    }
  }

  async stop(): Promise<void> {
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }
  }
}
