import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import websocket from '@fastify/websocket';
import { VoicePipeline } from './voice-pipeline';
import { prisma } from '@voiceflow/db';
import twilio from 'twilio';

export async function voiceRoutes(fastify: FastifyInstance) {
  await fastify.register(websocket);

  // Twilio inbound call webhook
  fastify.post('/api/voice/inbound', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, string>;
    const callSid = body.CallSid;
    const from = body.From;
    const to = body.To;

    console.log(`Inbound call: ${callSid} from ${from} to ${to}`);

    // Find agent by phone number
    const tenant = await prisma.tenant.findFirst({
      where: { twilioPhone: to },
      include: {
        agents: {
          where: { isActive: true },
          include: {
            workflows: {
              where: { status: 'PRODUCTION' },
              take: 1,
              orderBy: { publishedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!tenant || !tenant.agents[0]?.workflows[0]) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, this number is not configured. Goodbye.');
      twiml.hangup();
      reply.type('text/xml').send(twiml.toString());
      return;
    }

    const agent = tenant.agents[0];
    const workflow = agent.workflows[0];

    // Create call record
    const call = await prisma.call.create({
      data: {
        twilioCallSid: callSid,
        direction: 'INBOUND',
        status: 'IN_PROGRESS',
        fromNumber: from,
        toNumber: to,
        agentId: agent.id,
        workflowId: workflow.id,
        tenantId: tenant.id,
      },
    });

    // Return TwiML to connect media stream
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const wsUrl = baseUrl.replace('http', 'ws');

    const twiml = new twilio.twiml.VoiceResponse();
    const connect = twiml.connect();
    connect.stream({
      url: `${wsUrl}/api/voice/media-stream?callId=${call.id}&agentId=${agent.id}&workflowId=${workflow.id}&tenantId=${tenant.id}`,
    });

    reply.type('text/xml').send(twiml.toString());
  });

  // Twilio status callback
  fastify.post('/api/voice/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, string>;
    const callSid = body.CallSid;
    const status = body.CallStatus;
    const duration = body.CallDuration;

    if (callSid) {
      const statusMap: Record<string, string> = {
        completed: 'COMPLETED',
        failed: 'FAILED',
        busy: 'BUSY',
        'no-answer': 'NO_ANSWER',
      };

      await prisma.call.updateMany({
        where: { twilioCallSid: callSid },
        data: {
          status: (statusMap[status] || 'COMPLETED') as any,
          durationSeconds: duration ? parseInt(duration) : undefined,
          endedAt: new Date(),
        },
      });
    }

    reply.send({ success: true });
  });

  // WebSocket media stream handler
  fastify.get(
    '/api/voice/media-stream',
    { websocket: true },
    (socket, request) => {
      const query = request.query as Record<string, string>;
      const { callId, agentId, workflowId, tenantId } = query;

      if (!callId || !agentId || !workflowId || !tenantId) {
        socket.close(1008, 'Missing parameters');
        return;
      }

      const pipeline = new VoicePipeline(
        socket as any,
        callId,
        agentId,
        workflowId,
        tenantId,
      );

      pipeline.start().catch((error) => {
        console.error(`Pipeline start error for call ${callId}:`, error);
        socket.close(1011, 'Pipeline error');
      });
    },
  );

  // Manual outbound call trigger
  fastify.post(
    '/api/voice/outbound',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { agentId, workflowId, toPhone, metadata } = request.body as {
        agentId: string;
        workflowId: string;
        toPhone: string;
        metadata?: Record<string, unknown>;
      };

      const tenant = await prisma.tenant.findUnique({
        where: { id: request.user.tenantId },
      });

      if (!tenant?.twilioSid || !tenant?.twilioAuth || !tenant?.twilioPhone) {
        return reply.status(400).send({
          success: false,
          error: 'Twilio not configured. Please add Twilio credentials in Settings.',
        });
      }

      const call = await prisma.call.create({
        data: {
          direction: 'OUTBOUND',
          status: 'INITIATED',
          fromNumber: tenant.twilioPhone,
          toNumber: toPhone,
          agentId,
          workflowId,
          tenantId: tenant.id,
          metadata: metadata as any,
        },
      });

      const client = twilio(tenant.twilioSid, tenant.twilioAuth);
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

      try {
        const twilioCall = await client.calls.create({
          to: toPhone,
          from: tenant.twilioPhone,
          url: `${baseUrl}/api/voice/outbound-twiml?callId=${call.id}&agentId=${agentId}&workflowId=${workflowId}&tenantId=${tenant.id}`,
          statusCallback: `${baseUrl}/api/voice/status`,
          statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
        });

        await prisma.call.update({
          where: { id: call.id },
          data: { twilioCallSid: twilioCall.sid, status: 'RINGING' },
        });

        reply.send({ success: true, data: { callId: call.id, twilioSid: twilioCall.sid } });
      } catch (error: any) {
        await prisma.call.update({
          where: { id: call.id },
          data: { status: 'FAILED' },
        });
        reply.status(500).send({ success: false, error: error.message });
      }
    },
  );

  // TwiML for outbound calls
  fastify.post('/api/voice/outbound-twiml', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const { callId, agentId, workflowId, tenantId } = query;

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const wsUrl = baseUrl.replace('http', 'ws');

    const twiml = new twilio.twiml.VoiceResponse();
    const connect = twiml.connect();
    connect.stream({
      url: `${wsUrl}/api/voice/media-stream?callId=${callId}&agentId=${agentId}&workflowId=${workflowId}&tenantId=${tenantId}`,
    });

    reply.type('text/xml').send(twiml.toString());
  });
}
