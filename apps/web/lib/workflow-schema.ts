import { z } from 'zod'

export const QuestionSchema = z.object({
  key: z.string(),
  prompt: z.string(),
  retry_prompt: z.string().optional(),
  type: z.enum(['text', 'phone', 'datetime', 'choice', 'number', 'confirmation']),
  choices: z.array(z.string()).optional(),
  validation: z
    .object({
      regex: z.string().optional(),
      llm_check: z.string().optional(),
    })
    .optional(),
  required: z.boolean(),
  skippable_phrase: z.string().optional(),
})

export const WorkflowSchema = z.object({
  version: z.literal(1),
  language: z.enum(['en', 'hi', 'en-IN']),
  voice: z.object({
    provider: z.literal('smallest_ai'),
    voice_id: z.string(),
    speed: z.number().optional(),
  }),
  persona: z.object({
    role: z.string(),
    tone: z.enum(['friendly', 'formal', 'playful', 'concise']),
    style_notes: z.string().optional(),
  }),
  greeting: z.string(),
  questions: z.array(QuestionSchema),
  tools: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('google_calendar.book'),
        config: z.object({
          calendar_id: z.string(),
          duration_min: z.number(),
          buffer_min: z.number().optional(),
        }),
      }),
      z.object({
        type: z.literal('webhook'),
        config: z.object({
          url: z.string(),
          method: z.literal('POST'),
          headers: z.record(z.string()).optional(),
        }),
      }),
      z.object({
        type: z.literal('knowledge_lookup'),
        config: z.object({ collection_id: z.string() }),
      }),
    ])
  ),
  closing: z.string(),
  fallback: z.object({
    out_of_scope: z.string(),
    cannot_understand: z.string(),
    max_silence_sec: z.number(),
  }),
})

export type Workflow = z.infer<typeof WorkflowSchema>
export type WorkflowQuestion = z.infer<typeof QuestionSchema>
