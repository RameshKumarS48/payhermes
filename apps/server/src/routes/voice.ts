import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import twilio from 'twilio'
import { supabase } from '../lib/supabase'
import { createSession } from '../voice/session'
import { VoicePipeline } from '../voice/pipeline'
import { env } from '../config/env'

export async function voiceRoutes(app: FastifyInstance): Promise<void> {
  // Twilio inbound call webhook — returns TwiML to connect media stream
  app.post('/api/voice/inbound', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, string>
    const callSid = body['CallSid'] ?? ''
    const from = body['From'] ?? ''
    const to = body['To'] ?? ''

    app.log.info({ callSid, from, to }, 'Inbound call')

    // Find agent by phone number (stored in agents.phone_number)
    const { data: agent } = await supabase
      .from('agents')
      .select('id, workflow, voice_id, status')
      .eq('phone_number', to)
      .eq('status', 'active')
      .maybeSingle()

    if (!agent) {
      const twiml = new twilio.twiml.VoiceResponse()
      twiml.say('Sorry, this number is not configured. Goodbye.')
      twiml.hangup()
      return reply.type('text/xml').send(twiml.toString())
    }

    const wf = agent.workflow as { language?: string } | null

    // Create call record
    const { data: call } = await supabase
      .from('calls')
      .insert({
        agent_id: agent.id,
        direction: 'inbound',
        status: 'in_progress',
        from_number: from,
        to_number: to,
        twilio_call_sid: callSid,
      })
      .select('id')
      .single()

    if (!call) {
      reply.status(500).send('DB error')
      return
    }

    createSession({
      callId: call.id,
      agentId: agent.id,
      voiceId: agent.voice_id ?? 'emily-en-us',
      language: wf?.language ?? 'en',
    })

    const wsUrl = env.API_BASE_URL.replace(/^http/, 'ws')
    const twiml = new twilio.twiml.VoiceResponse()
    const connect = twiml.connect()
    connect.stream({ url: `${wsUrl}/api/voice/stream?callId=${call.id}` })

    return reply.type('text/xml').send(twiml.toString())
  })

  // Twilio status callback
  app.post('/api/voice/status', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, string>
    const callSid = body['CallSid']
    const rawStatus = body['CallStatus'] ?? ''
    const duration = body['CallDuration']

    const statusMap: Record<string, string> = {
      completed: 'completed',
      failed: 'failed',
      busy: 'busy',
      'no-answer': 'no_answer',
    }

    if (callSid) {
      await supabase
        .from('calls')
        .update({
          status: statusMap[rawStatus] ?? 'completed',
          duration_seconds: duration ? parseInt(duration) : null,
          ended_at: new Date().toISOString(),
        })
        .eq('twilio_call_sid', callSid)
    }

    return reply.send({ ok: true })
  })

  // WebSocket media stream
  app.get('/api/voice/stream', { websocket: true }, (socket, req) => {
    const callId = (req.query as Record<string, string>)['callId']

    if (!callId) {
      socket.close(1008, 'Missing callId')
      return
    }

    const pipeline = new VoicePipeline(socket as unknown as import('ws').WebSocket, callId)

    pipeline.start().catch((err: unknown) => {
      app.log.error({ callId, err }, 'Pipeline start failed')
      socket.close(1011, 'Pipeline error')
    })
  })

  // Outbound call — triggered from web app
  app.post('/api/voice/outbound', async (req: FastifyRequest, reply: FastifyReply) => {
    const { agentId, toPhone } = req.body as { agentId: string; toPhone: string }

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      return reply.status(400).send({ error: 'Twilio not configured on server' })
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('id, workflow, voice_id')
      .eq('id', agentId)
      .single()

    if (!agent) return reply.status(404).send({ error: 'Agent not found' })

    const wf = agent.workflow as { language?: string } | null

    const { data: call } = await supabase
      .from('calls')
      .insert({
        agent_id: agentId,
        direction: 'outbound',
        status: 'initiated',
        from_number: env.TWILIO_PHONE_NUMBER,
        to_number: toPhone,
      })
      .select('id')
      .single()

    if (!call) return reply.status(500).send({ error: 'DB error' })

    createSession({
      callId: call.id,
      agentId,
      voiceId: agent.voice_id ?? 'emily-en-us',
      language: wf?.language ?? 'en',
    })

    const wsUrl = env.API_BASE_URL.replace(/^http/, 'ws')
    const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

    try {
      const twilioCall = await twilioClient.calls.create({
        to: toPhone,
        from: env.TWILIO_PHONE_NUMBER,
        url: `${env.API_BASE_URL}/api/voice/outbound-twiml?callId=${call.id}`,
        statusCallback: `${env.API_BASE_URL}/api/voice/status`,
        statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
      })

      await supabase
        .from('calls')
        .update({ twilio_call_sid: twilioCall.sid, status: 'ringing' })
        .eq('id', call.id)

      return reply.send({ callId: call.id, twilioSid: twilioCall.sid })
    } catch (err: unknown) {
      await supabase.from('calls').update({ status: 'failed' }).eq('id', call.id)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return reply.status(500).send({ error: msg })
    }
  })

  // TwiML for outbound (Twilio fetches this when the callee picks up)
  app.post('/api/voice/outbound-twiml', async (req: FastifyRequest, reply: FastifyReply) => {
    const callId = (req.query as Record<string, string>)['callId']
    const wsUrl = env.API_BASE_URL.replace(/^http/, 'ws')
    const twiml = new twilio.twiml.VoiceResponse()
    const connect = twiml.connect()
    connect.stream({ url: `${wsUrl}/api/voice/stream?callId=${callId}` })
    return reply.type('text/xml').send(twiml.toString())
  })

  // List calls for an agent
  app.get('/api/calls', async (req: FastifyRequest, reply: FastifyReply) => {
    const { agentId } = req.query as { agentId?: string }
    if (!agentId) return reply.status(400).send({ error: 'agentId required' })

    const { data: calls } = await supabase
      .from('calls')
      .select('id, direction, status, from_number, to_number, duration_seconds, started_at, ended_at')
      .eq('agent_id', agentId)
      .order('started_at', { ascending: false })
      .limit(50)

    return reply.send({ calls: calls ?? [] })
  })

  // Get call detail
  app.get('/api/calls/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string }

    const { data: call } = await supabase
      .from('calls')
      .select('*')
      .eq('id', id)
      .single()

    if (!call) return reply.status(404).send({ error: 'Not found' })
    return reply.send({ call })
  })
}
