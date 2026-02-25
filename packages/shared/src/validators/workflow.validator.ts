import { z } from 'zod';

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string(),
    config: z.record(z.unknown()),
  }),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string().optional(),
  target: z.string(),
  label: z.string().optional(),
  animated: z.boolean().optional(),
  data: z
    .object({
      condition: z.string().optional(),
    })
    .optional(),
});

export const workflowGraphSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantName: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const agentCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  useCase: z.enum([
    'CUSTOMER_SUPPORT',
    'APPOINTMENT_BOOKING',
    'ORDER_STATUS',
    'PAYMENT_REMINDER',
    'OTP_VERIFICATION',
    'SURVEY',
    'LEAD_QUALIFICATION',
    'CUSTOM',
  ]),
  language: z.enum(['en-US', 'hi-IN', 'hinglish']),
  voiceId: z.string().optional(),
  systemPrompt: z.string().optional(),
});
