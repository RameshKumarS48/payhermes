const express = require('express');
const db = require('../config/database');
const { validate, schemas } = require('../utils/validators');
const { webhookLimiter } = require('../middleware/rateLimiter');
const { startFunnel, processInboundMessage } = require('../services/conversation-engine');
const logger = require('../utils/logger');

const router = express.Router();
router.use(webhookLimiter);

// New lead webhook (public, keyed by business API key or funnel_id)
router.post('/new-lead', validate(schemas.newLeadWebhook), async (req, res, next) => {
  try {
    const { phone, name, email, source, funnel_id, metadata } = req.validated;

    // Look up funnel to get business_id
    let businessId;
    let funnelId = funnel_id;

    if (funnel_id) {
      const funnel = await db('funnels').where({ id: funnel_id, status: 'active' }).first();
      if (!funnel) return res.status(404).json({ error: 'Funnel not found or inactive' });
      businessId = funnel.business_id;
      funnelId = funnel.id;
    } else {
      return res.status(400).json({ error: 'funnel_id is required' });
    }

    // Deduplicate
    const existing = await db('leads').where({ business_id: businessId, phone }).first();
    if (existing) {
      await logWebhook(businessId, 'new_lead_duplicate', source, req.validated, 200);
      return res.json({ lead_id: existing.id, status: 'existing' });
    }

    // Create lead
    const [lead] = await db('leads').insert({
      business_id: businessId,
      funnel_id: funnelId,
      phone, name, email, source,
      metadata: JSON.stringify(metadata || {}),
      status: 'new',
    }).returning('*');

    // Create conversation
    await db('conversations').insert({
      lead_id: lead.id,
      business_id: businessId,
      funnel_id: funnelId,
      channel: 'sms',
      status: 'active',
    });

    // Update funnel stats
    await db('funnels').where({ id: funnelId }).increment('leads_processed', 1);

    await logWebhook(businessId, 'new_lead', source, req.validated, 201);

    // Trigger funnel (async, don't block response)
    startFunnel(lead.id).catch((err) => logger.error(`Funnel start error: ${err.message}`));

    res.status(201).json({ lead_id: lead.id, status: 'created' });
  } catch (err) {
    next(err);
  }
});

// Twilio inbound SMS
router.post('/twilio-inbound', async (req, res, next) => {
  try {
    const { From: from, Body: body } = req.body;
    const phone = from.replace('whatsapp:', '');

    const lead = await db('leads').where({ phone }).first();
    if (!lead) {
      logger.warn(`Inbound from unknown phone: ${phone}`);
      return res.status(200).send('<Response></Response>');
    }

    await logWebhook(lead.business_id, 'twilio_inbound', 'twilio', { phone, body }, 200);

    processInboundMessage(lead.id, body).catch((err) =>
      logger.error(`Process inbound error: ${err.message}`)
    );

    res.status(200).send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});

// Twilio status callback
router.post('/twilio-status', async (req, res, next) => {
  try {
    const { MessageSid, MessageStatus } = req.body;
    if (MessageSid) {
      await db('messages').where({ external_id: MessageSid }).update({ status: MessageStatus });
    }
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

// WhatsApp webhook (Twilio format)
router.post('/whatsapp', async (req, res, next) => {
  try {
    const { From: from, Body: body } = req.body;
    const phone = from.replace('whatsapp:', '');

    const lead = await db('leads').where({ phone }).first();
    if (!lead) return res.status(200).send('<Response></Response>');

    await logWebhook(lead.business_id, 'whatsapp_inbound', 'whatsapp', { phone, body }, 200);

    processInboundMessage(lead.id, body).catch((err) =>
      logger.error(`Process WhatsApp error: ${err.message}`)
    );

    res.status(200).send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});

async function logWebhook(businessId, eventType, source, payload, statusCode) {
  try {
    await db('webhook_logs').insert({
      business_id: businessId,
      event_type: eventType,
      source,
      payload: JSON.stringify(payload),
      status_code: statusCode,
    });
  } catch (err) {
    logger.warn(`Webhook log failed: ${err.message}`);
  }
}

module.exports = router;
