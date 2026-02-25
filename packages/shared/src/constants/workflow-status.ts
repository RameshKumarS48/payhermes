export const WORKFLOW_STATUSES = {
  DRAFT: 'DRAFT',
  SANDBOX: 'SANDBOX',
  PRODUCTION: 'PRODUCTION',
  ARCHIVED: 'ARCHIVED',
} as const;

export type WorkflowStatusType =
  (typeof WORKFLOW_STATUSES)[keyof typeof WORKFLOW_STATUSES];
