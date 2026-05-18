import { pcmToMulaw } from './audio-utils'
import { env } from '../config/env'

const WAVES_URL = 'https://waves-api.smallest.ai/api/v1/lightning/get_speech'

const LANGUAGE_VOICE_MAP: Record<string, string> = {
  en: 'emily',
  'en-IN': 'emily',
  hi: 'riya',
}

export class TTSService {
  async synthesize(text: string, voiceId: string, language: string): Promise<Buffer> {
    const voice = voiceId.split('-')[0] ?? LANGUAGE_VOICE_MAP[language] ?? 'emily'
    const sampleRate = 24000

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const res = await fetch(WAVES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SMALLEST_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice_id: voice, sample_rate: sampleRate, add_wav_header: false }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const msg = await res.text().catch(() => 'unknown');
        throw new Error(`Waves TTS ${res.status}: ${msg}`);
      }

      const pcm = Buffer.from(await res.arrayBuffer());
      return pcmToMulaw(pcm, sampleRate);
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('TTS request timed out after 30 seconds');
      }
      throw err;
    }

  toBase64Chunks(audio: Buffer, chunkSize = 640): string[] {
    const chunks: string[] = []
    for (let i = 0; i < audio.length; i += chunkSize) {
      chunks.push(audio.subarray(i, i + chunkSize).toString('base64'))
    }
    return chunks
  }
}
