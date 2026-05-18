const MULAW_DECODE_TABLE = new Int16Array(256)
for (let i = 0; i < 256; i++) {
  let mu = ~i & 0xff
  const sign = mu & 0x80 ? -1 : 1
  mu = mu & 0x7f
  const exponent = (mu >> 4) & 0x07
  const mantissa = mu & 0x0f
  let sample = ((mantissa << 1) + 33) << (exponent + 2)
  sample = sign * (sample - 33)
  MULAW_DECODE_TABLE[i] = sample
}

function pcmSampleToMulaw(sample: number): number {
  const BIAS = 0x84
  const CLIP = 32635
  const sign = sample < 0 ? 0x80 : 0
  if (sample < 0) sample = -sample
  if (sample > CLIP) sample = CLIP
  sample += BIAS
  let exponent = 7
  const expMask = 0x4000
  for (; exponent > 0; exponent--) {
    if (sample & (expMask >> (7 - exponent))) break
  }
  const mantissa = (sample >> (exponent + 3)) & 0x0f
  return ~(sign | (exponent << 4) | mantissa) & 0xff
}

export function pcmToMulaw(pcmBuffer: Buffer, inputSampleRate = 8000): Buffer {
  const bytesPerSample = 2
  const inputSampleCount = pcmBuffer.length / bytesPerSample

  if (inputSampleRate === 8000) {
    const output = Buffer.alloc(inputSampleCount)
    for (let i = 0; i < inputSampleCount; i++) {
      const sample = pcmBuffer.readInt16LE(i * bytesPerSample)
      output[i] = pcmSampleToMulaw(sample)
    }
    return output
  }

  const ratio = inputSampleRate / 8000
  const outputSampleCount = Math.floor(inputSampleCount / ratio)
  const output = Buffer.alloc(outputSampleCount)
  for (let i = 0; i < outputSampleCount; i++) {
    const srcIndex = i * ratio
    const srcFloor = Math.floor(srcIndex)
    const srcCeil = Math.min(srcFloor + 1, inputSampleCount - 1)
    const frac = srcIndex - srcFloor
    const s1 = pcmBuffer.readInt16LE(srcFloor * bytesPerSample)
    const s2 = pcmBuffer.readInt16LE(srcCeil * bytesPerSample)
    const sample = Math.round(s1 + frac * (s2 - s1))
    output[i] = pcmSampleToMulaw(sample)
  }
  return output
}

export function mulawToPcm(mulawBuffer: Buffer): Buffer {
  const output = Buffer.alloc(mulawBuffer.length * 2)
  for (let i = 0; i < mulawBuffer.length; i++) {
    output.writeInt16LE(MULAW_DECODE_TABLE[mulawBuffer[i] as number] as number, i * 2)
  }
  return output
}
