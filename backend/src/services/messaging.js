const twilio = require('twilio');
const db = require('../config/database');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

async function getTwilioClient(businessId) {
  const biz = await db('businesses').where({ id: businessId }).first();
  const config = biz.messaging_config || {};
  if (!config.twilio_account_sid || !config.twilio_auth_token) {
    throw new AppError('Twilio not configured for this business', 400);
  }
  return {
    client: twilio(config.twilio_account_sid, config.twilio_auth_token),
    from: config.twilio_phone_number,
  };
}

async function sendSMS(businessId, to, body, conversationId, stepId) {
  const { client, from } = await getTwilioClient(businessId);

  try {
    const msg = await client.messages.create({ body, to, from });

    const lead = await db('leads').where({ business_id: businessId, phone: to }).first();
    if (lead && conversationId) {
      await db('messages').insert({
        conversation_id: conversationId,
        lead_id: lead.id,
        direction: 'outbound',
        body,
        channel: 'sms',
        status: 'sent',
        external_id: msg.sid,
        step_id: stepId,
      });
    }

    return msg;
  } catch (err) {
    logger.error(`SMS send failed: ${err.message}`);
    throw new AppError('Failed to send SMS', 502);
  }
}

async function sendWhatsApp(businessId, to, body, conversationId, stepId) {
  const { client, from } = await getTwilioClient(businessId);

  try {
    const msg = await client.messages.create({
      body,
      to: `whatsapp:${to}`,
      from: `whatsapp:${from}`,
    });

    const lead = await db('leads').where({ business_id: businessId, phone: to }).first();
    if (lead && conversationId) {
      await db('messages').insert({
        conversation_id: conversationId,
        lead_id: lead.id,
        direction: 'outbound',
        body,
        channel: 'whatsapp',
        status: 'sent',
        external_id: msg.sid,
        step_id: stepId,
      });
    }

    return msg;
  } catch (err) {
    logger.error(`WhatsApp send failed: ${err.message}`);
    throw new AppError('Failed to send WhatsApp message', 502);
  }
}

module.exports = { sendSMS, sendWhatsApp };
