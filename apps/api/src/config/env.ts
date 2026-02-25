import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().default('').transform((val) => val || process.env.JWT_SECRET || 'fallback-refresh-secret'),
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_PHONE_NUMBER: z.string().default(''),
  DEEPGRAM_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string().default(''),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().default(''),
  GOOGLE_PRIVATE_KEY: z.string().default(''),
  API_PORT: z.coerce.number().default(3001),
  API_BASE_URL: z.string().default(''),
  WEB_URL: z.string().default(''),
  PORT: z.coerce.number().optional(), // Railway provides this
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
