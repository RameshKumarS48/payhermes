const express = require('express');
const crypto = require('crypto');
const db = require('../config/database');
const { validate, schemas } = require('../utils/validators');
const { webhookLimiter } = require('../middleware/rateLimiter');
const { startFunnel, processInboundMessage } = require('../services/conversation-engine');
const logger = require('../utils/logger');

const router = express.Router();
router.use(webhookLimiter);

// ─── Helper: create lead + conversation + start funnel ───────────────
async function createLeadAndStart({ businessId, funnelId, phone, name, email, source, channel, metadata }) {
  // Deduplicate by phone + business
  const existing = await db('leads').where({ business_id: businessId, phone }).first();
  if (existing) {
    await logWebhook(businessId, 'new_lead_duplicate', source, { phone }, 200);
    return { lead: existing, created: false };
  }

  const [lead] = await db('leads').insert({
    business_id: businessId,
    funnel_id: funnelId,
    phone,
    name: name || null,
    email: email || null,
    source,
    metadata: JSON.stringify(metadata || {}),
    status: 'new',
  }).returning('*');

  await db('conversations').insert({
    lead_id: lead.id,
    business_id: businessId,
    funnel_id: funnelId,
    channel: channel || 'sms',
    status: 'active',
  });

  if (funnelId) {
    await db('funnels').where({ id: funnelId }).increment('leads_processed', 1);
  }

  await logWebhook(businessId, 'new_lead', source, { phone, name }, 201);

  // Start funnel async
  if (funnelId) {
    startFunnel(lead.id).catch((err) => logger.error(`Funnel start error: ${err.message}`));
  }

  return { lead, created: true };
}

// ─── Helper: resolve business default funnel ─────────────────────────
async function getDefaultFunnel(businessId) {
  return db('funnels')
    .where({ business_id: businessId, status: 'active', trigger_type: 'new_lead' })
    .orderBy('created_at', 'desc')
    .first();
}

// ─── Helper: resolve business from Twilio "To" number ────────────────
async function findBusinessByPhone(toPhone) {
  const phone = toPhone.replace('whatsapp:', '');
  const businesses = await db('businesses').select('id', 'messaging_config');
  return businesses.find((b) => {
    const config = b.messaging_config || {};
    return config.twilio_phone_number === phone;
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 1. ORIGINAL: Direct webhook (requires funnel_id)
// ═══════════════════════════════════════════════════════════════════════
router.post('/new-lead', validate(schemas.newLeadWebhook), async (req, res, next) => {
  try {
    const { phone, name, email, source, funnel_id, metadata } = req.validated;

    if (!funnel_id) {
      return res.status(400).json({ error: 'funnel_id is required' });
    }

    const funnel = await db('funnels').where({ id: funnel_id, status: 'active' }).first();
    if (!funnel) return res.status(404).json({ error: 'Funnel not found or inactive' });

    const { lead, created } = await createLeadAndStart({
      businessId: funnel.business_id,
      funnelId: funnel.id,
      phone, name, email, source,
      channel: 'sms',
      metadata,
    });

    res.status(created ? 201 : 200).json({ lead_id: lead.id, status: created ? 'created' : 'existing' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 2. GENERIC API-KEY WEBHOOK (Zapier / Make / any platform)
//    POST /api/webhooks/inbound?api_key=ph_xxx
//    Body: { phone, name?, email?, source?, metadata? }
// ═══════════════════════════════════════════════════════════════════════
router.post('/inbound', async (req, res, next) => {
  try {
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Missing api_key query param or X-API-Key header' });

    const business = await db('businesses').where({ api_key: apiKey }).first();
    if (!business) return res.status(401).json({ error: 'Invalid API key' });

    const { phone, name, email, source, metadata } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const funnel = await getDefaultFunnel(business.id);
    if (!funnel) return res.status(400).json({ error: 'No active funnel with trigger_type "new_lead" found. Create and activate a funnel first.' });

    const { lead, created } = await createLeadAndStart({
      businessId: business.id,
      funnelId: funnel.id,
      phone, name, email,
      source: source || 'api',
      channel: 'sms',
      metadata,
    });

    res.status(created ? 201 : 200).json({ lead_id: lead.id, status: created ? 'created' : 'existing' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 3. META LEAD ADS WEBHOOK (Facebook / Instagram Lead Ads)
//    GET  /api/webhooks/meta-leadgen  — verification challenge
//    POST /api/webhooks/meta-leadgen  — lead notification
// ═══════════════════════════════════════════════════════════════════════

// Meta webhook verification (they send a GET to verify your endpoint)
router.get('/meta-leadgen', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Each business stores their verify_token in settings.meta_verify_token
  // For simplicity, also accept a global env var
  const expectedToken = process.env.META_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info('Meta webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Meta sends leadgen notifications here
router.post('/meta-leadgen', async (req, res, next) => {
  try {
    const { object, entry } = req.body;

    if (object !== 'page' && object !== 'instagram') {
      return res.sendStatus(200); // Acknowledge but ignore non-lead events
    }

    for (const pageEntry of entry || []) {
      for (const change of pageEntry.changes || []) {
        if (change.field !== 'leadgen') continue;

        const leadgenData = change.value;
        // leadgenData has: leadgen_id, page_id, form_id, created_time

        // Find which business owns this Meta page
        const business = await db('businesses')
          .whereRaw("settings->>'meta_page_id' = ?", [String(leadgenData.page_id)])
          .first();

        if (!business) {
          logger.warn(`Meta leadgen for unknown page_id: ${leadgenData.page_id}`);
          continue;
        }

        // Fetch the actual lead data from Meta Graph API
        const metaConfig = business.settings?.meta_config || {};
        const accessToken = metaConfig.access_token;

        if (!accessToken) {
          logger.warn(`No Meta access token for business ${business.id}`);
          await logWebhook(business.id, 'meta_leadgen_no_token', 'meta', leadgenData, 200);
          continue;
        }

        // Fetch lead details from Meta
        const leadRes = await fetch(
          `https://graph.facebook.com/v21.0/${leadgenData.leadgen_id}?access_token=${accessToken}`
        );
        const metaLead = await leadRes.json();

        if (metaLead.error) {
          logger.error(`Meta Graph API error: ${metaLead.error.message}`);
          await logWebhook(business.id, 'meta_leadgen_api_error', 'meta', metaLead.error, 200);
          continue;
        }

        // Extract fields from Meta's field_data array
        const fields = {};
        for (const f of metaLead.field_data || []) {
          fields[f.name.toLowerCase()] = f.values?.[0] || '';
        }

        const phone = fields.phone_number || fields.phone || fields.mobile;
        if (!phone) {
          logger.warn('Meta lead missing phone number', { leadgen_id: leadgenData.leadgen_id, fields });
          await logWebhook(business.id, 'meta_leadgen_no_phone', 'meta', fields, 200);
          continue;
        }

        // Normalize phone (Meta often gives +1XXXXXXXXXX format)
        const normalizedPhone = phone.replace(/[^+\d]/g, '');

        const funnel = await getDefaultFunnel(business.id);
        if (!funnel) {
          logger.warn(`No active funnel for business ${business.id}`);
          continue;
        }

        await createLeadAndStart({
          businessId: business.id,
          funnelId: funnel.id,
          phone: normalizedPhone,
          name: [fields.first_name, fields.last_name].filter(Boolean).join(' ') || fields.full_name || null,
          email: fields.email || null,
          source: object === 'instagram' ? 'instagram_ad' : 'facebook_ad',
          channel: 'sms',
          metadata: {
            meta_leadgen_id: leadgenData.leadgen_id,
            meta_form_id: leadgenData.form_id,
            meta_page_id: leadgenData.page_id,
            meta_fields: fields,
          },
        });
      }
    }

    // Meta requires a 200 response within 20 seconds
    res.sendStatus(200);
  } catch (err) {
    logger.error(`Meta leadgen webhook error: ${err.message}`);
    res.sendStatus(200); // Always 200 to Meta so they don't retry excessively
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 4. TWILIO INBOUND SMS — auto-creates leads from unknown numbers
// ═══════════════════════════════════════════════════════════════════════
router.post('/twilio-inbound', async (req, res, next) => {
  try {
    const { From: from, To: to, Body: body } = req.body;
    const phone = from.replace('whatsapp:', '');

    // Try to find existing lead
    let lead = await db('leads').where({ phone }).first();

    if (lead) {
      // Existing lead — route to conversation engine
      await logWebhook(lead.business_id, 'twilio_inbound', 'twilio', { phone, body }, 200);
      processInboundMessage(lead.id, body).catch((err) =>
        logger.error(`Process inbound error: ${err.message}`)
      );
    } else {
      // Unknown number — auto-create lead
      const business = await findBusinessByPhone(to);
      if (!business) {
        logger.warn(`Inbound to unknown Twilio number: ${to}`);
        return res.status(200).send('<Response></Response>');
      }

      const funnel = await getDefaultFunnel(business.id);
      if (!funnel) {
        logger.warn(`No active funnel for business ${business.id}, ignoring inbound from ${phone}`);
        return res.status(200).send('<Response></Response>');
      }

      const { lead: newLead } = await createLeadAndStart({
        businessId: business.id,
        funnelId: funnel.id,
        phone,
        name: null,
        email: null,
        source: 'sms_inbound',
        channel: 'sms',
        metadata: { first_message: body },
      });

      // Also save their first message
      const conversation = await db('conversations')
        .where({ lead_id: newLead.id, status: 'active' })
        .first();

      if (conversation) {
        await db('messages').insert({
          conversation_id: conversation.id,
          lead_id: newLead.id,
          direction: 'inbound',
          body,
          channel: 'sms',
        });
      }

      logger.info(`Auto-created lead from inbound SMS: ${phone}`);
    }

    res.status(200).send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 5. WHATSAPP INBOUND — auto-creates leads from unknown numbers
// ═══════════════════════════════════════════════════════════════════════
router.post('/whatsapp', async (req, res, next) => {
  try {
    const { From: from, To: to, Body: body } = req.body;
    const phone = from.replace('whatsapp:', '');

    let lead = await db('leads').where({ phone }).first();

    if (lead) {
      await logWebhook(lead.business_id, 'whatsapp_inbound', 'whatsapp', { phone, body }, 200);
      processInboundMessage(lead.id, body).catch((err) =>
        logger.error(`Process WhatsApp error: ${err.message}`)
      );
    } else {
      // Auto-create lead from WhatsApp
      const toPhone = (to || '').replace('whatsapp:', '');
      const business = await findBusinessByPhone(toPhone);
      if (!business) {
        logger.warn(`WhatsApp inbound to unknown number: ${to}`);
        return res.status(200).send('<Response></Response>');
      }

      const funnel = await getDefaultFunnel(business.id);
      if (!funnel) {
        logger.warn(`No active funnel for business ${business.id}`);
        return res.status(200).send('<Response></Response>');
      }

      const { lead: newLead } = await createLeadAndStart({
        businessId: business.id,
        funnelId: funnel.id,
        phone,
        name: null,
        email: null,
        source: 'whatsapp_inbound',
        channel: 'whatsapp',
        metadata: { first_message: body },
      });

      const conversation = await db('conversations')
        .where({ lead_id: newLead.id, status: 'active' })
        .first();

      if (conversation) {
        await db('messages').insert({
          conversation_id: conversation.id,
          lead_id: newLead.id,
          direction: 'inbound',
          body,
          channel: 'whatsapp',
        });
      }

      logger.info(`Auto-created lead from WhatsApp: ${phone}`);
    }

    res.status(200).send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});

// Twilio status callback (unchanged)
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
