import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_PHONE_NUMBER: z.string().default(''),
  SMALLEST_AI_API_KEY: z.string().default(''),
  OPENROUTER_API_KEY: z.string().default(''),
  API_BASE_URL: z.string().default('http://localhost:3001'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
})

export const env = schema.parse(process.env)
export type Env = z.infer<typeof schema>
