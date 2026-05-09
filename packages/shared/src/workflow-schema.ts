import { z } from 'zod'

// Phase 0 stub — full workflow schema defined in Phase 1
export const WorkflowSchema = z.object({}).passthrough()

export type Workflow = z.infer<typeof WorkflowSchema>
