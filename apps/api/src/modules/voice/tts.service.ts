import { createClient } from '@deepgram/sdk';
import { env } from '../../config/env';

export class TTSService {
  private deepgram: any;

  constructor() {
    this.deepgram = createClient(env.DEEPGRAM_API_KEY);
  }

  async synthesize(text: string, language: string = 'en-US'): Promise<Buffer> {
    const voiceMap: Record<string, string> = {
      'en-US': 'aura-asteria-en',
      'hi-IN': 'aura-asteria-en', // Deepgram Hindi voice when available
      'hinglish': 'aura-asteria-en',
    };

    const response = await this.deepgram.speak.request(
      { text },
      {
        model: voiceMap[language] || 'aura-asteria-en',
        encoding: 'mulaw',
        sample_rate: 8000,
        container: 'none',
      },
    );

    const stream = await response.getStream();
    if (!stream) throw new Error('TTS stream unavailable');

    const chunks: Buffer[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks);
  }

  encodeToBase64Chunks(audioBuffer: Buffer, chunkSize: number = 640): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.subarray(i, i + chunkSize);
      chunks.push(chunk.toString('base64'));
    }
    return chunks;
  }
}
