import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '@voiceflow/db';
import twilio from 'twilio';

interface OutboundCallJob {
  callId: string;
  agentId: string;
  workflowId: string;
  tenantId: string;
  toPhone: string;
  fromPhone: string;
  twilioSid: string;
  twilioAuth: string;
  metadata?: Record<string, unknown>;
}

const OUTBOUND_QUEUE = 'outbound-calls';

export class OutboundEngine {
  private queue: Queue;
  private worker: Worker | null = null;

  constructor() {
    this.queue = new Queue(OUTBOUND_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  startWorker(): void {
    this.worker = new Worker(
      OUTBOUND_QUEUE,
      async (job: Job<OutboundCallJob>) => {
        await this.processCall(job.data);
      },
      {
        connection: redis,
        concurrency: 5, // Max concurrent outbound calls
        limiter: {
          max: 10,
          duration: 1000, // 10 calls per second max
        },
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`Outbound call completed: ${job.data.callId}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Outbound call failed: ${job?.data.callId}`, err.message);
    });
  }

  async scheduleCall(data: OutboundCallJob, delay?: number): Promise<string> {
    const job = await this.queue.add('outbound-call', data, {
      delay: delay ? delay * 60 * 1000 : undefined, // delay in minutes
    });
    return job.id || '';
  }

  async scheduleBatch(
    calls: Omit<OutboundCallJob, 'callId'>[],
    intervalMs: number = 2000,
  ): Promise<string[]> {
    const jobIds: string[] = [];
    for (let i = 0; i < calls.length; i++) {
      const call = await prisma.call.create({
        data: {
          direction: 'OUTBOUND',
          status: 'INITIATED',
          fromNumber: calls[i].fromPhone,
          toNumber: calls[i].toPhone,
          agentId: calls[i].agentId,
          workflowId: calls[i].workflowId,
          tenantId: calls[i].tenantId,
          metadata: calls[i].metadata as any,
        },
      });

      const job = await this.queue.add(
        'outbound-call',
        { ...calls[i], callId: call.id },
        { delay: i * intervalMs },
      );
      jobIds.push(job.id || '');
    }
    return jobIds;
  }

  private async processCall(data: OutboundCallJob): Promise<void> {
    const client = twilio(data.twilioSid, data.twilioAuth);
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

    try {
      const twilioCall = await client.calls.create({
        to: data.toPhone,
        from: data.fromPhone,
        url: `${baseUrl}/api/voice/outbound-twiml?callId=${data.callId}&agentId=${data.agentId}&workflowId=${data.workflowId}&tenantId=${data.tenantId}`,
        statusCallback: `${baseUrl}/api/voice/status`,
        statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
      });

      await prisma.call.update({
        where: { id: data.callId },
        data: { twilioCallSid: twilioCall.sid, status: 'RINGING' },
      });
    } catch (error: any) {
      await prisma.call.update({
        where: { id: data.callId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.queue.close();
  }
}
