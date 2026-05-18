import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { BUILDER_SYSTEM_PROMPT } from '@/lib/builder-system-prompt'
import { WorkflowSchema, type Workflow } from '@/lib/workflow-schema'

export interface BuilderMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface BuilderRequest {
  messages: BuilderMessage[]
  currentWorkflow?: Workflow
}

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 })
  }

  const body = (await request.json()) as BuilderRequest
  const { messages } = body

  if (!messages.length) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: BUILDER_SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
  ]

  try {
    const completion = await client.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: chatMessages,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    })

    const rawText = completion.choices[0]?.message?.content ?? ''
    const parsed: unknown = JSON.parse(rawText)
    const validation = WorkflowSchema.safeParse(parsed)

    if (!validation.success) {
      console.error('[workflow-builder] Zod validation failed:', validation.error.flatten())
      return NextResponse.json({ workflow: parsed, validationWarning: true })
    }

    return NextResponse.json({ workflow: validation.data })
  } catch (err) {
    console.error('[workflow-builder] error:', err)
    return NextResponse.json({ error: 'Failed to generate workflow' }, { status: 500 })
  }
}
