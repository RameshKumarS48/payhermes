const db = require('../config/database');
const { sendSMS } = require('./messaging');
const { parseAnswer } = require('./ai-parser');
const { getAvailability, bookAppointment, formatSlotsForSMS } = require('./calendar');
const logger = require('../utils/logger');

function substituteVars(text, data) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

async function startFunnel(leadId) {
  const lead = await db('leads').where({ id: leadId }).first();
  if (!lead || !lead.funnel_id) return;

  const funnel = await db('funnels').where({ id: lead.funnel_id }).first();
  if (!funnel) return;

  const funnelJson = funnel.funnel_json;
  const entryStep = funnelJson.entry_step;

  await db('leads').where({ id: leadId }).update({ current_step_id: entryStep, status: 'in_progress' });
  await executeStep(leadId, entryStep);
}

async function processInboundMessage(leadId, messageText) {
  const lead = await db('leads').where({ id: leadId }).first();
  if (!lead || !lead.funnel_id) return;

  const conversation = await db('conversations')
    .where({ lead_id: leadId, status: 'active' })
    .orderBy('started_at', 'desc')
    .first();

  if (conversation) {
    await db('messages').insert({
      conversation_id: conversation.id,
      lead_id: leadId,
      direction: 'inbound',
      body: messageText,
      channel: 'sms',
      step_id: lead.current_step_id,
    });
  }

  if (!lead.waiting_for_response) return;

  const funnel = await db('funnels').where({ id: lead.funnel_id }).first();
  const funnelJson = funnel.funnel_json;
  const currentStep = funnelJson.steps.find((s) => s.id === lead.current_step_id);
  if (!currentStep) return;

  if (currentStep.type === 'question') {
    const parsed = await parseAnswer(
      messageText,
      currentStep.answer_type || 'text',
      currentStep.text,
      currentStep.choices
    );

    const collectedData = { ...lead.collected_data, [currentStep.variable_name]: parsed.value };
    await db('leads').where({ id: leadId }).update({
      collected_data: JSON.stringify(collectedData),
      waiting_for_response: false,
      updated_at: db.fn.now(),
    });

    await trackEvent(lead.business_id, 'answer_collected', leadId, lead.funnel_id, {
      step: currentStep.id,
      variable: currentStep.variable_name,
      confidence: parsed.confidence,
    });

    if (currentStep.next_step) {
      await executeStep(leadId, currentStep.next_step);
    }
  } else if (currentStep.type === 'calendar_booking') {
    // Attempt to parse slot selection
    const num = parseInt(messageText.trim(), 10);
    if (num >= 1) {
      const lead2 = await db('leads').where({ id: leadId }).first();
      const pendingSlots = lead2.collected_data._pending_slots;
      if (pendingSlots && pendingSlots[num - 1]) {
        const slot = pendingSlots[num - 1];
        await bookAppointment(lead.business_id, leadId, slot, currentStep.duration_minutes || 30);

        const { _pending_slots, ...rest } = lead2.collected_data;
        await db('leads').where({ id: leadId }).update({
          collected_data: JSON.stringify(rest),
          waiting_for_response: false,
          status: 'booked',
          updated_at: db.fn.now(),
        });

        if (currentStep.next_step_booked) {
          await executeStep(leadId, currentStep.next_step_booked);
        }
      }
    } else if (/no|cancel|skip/i.test(messageText)) {
      await db('leads').where({ id: leadId }).update({ waiting_for_response: false });
      if (currentStep.next_step_declined) {
        await executeStep(leadId, currentStep.next_step_declined);
      }
    }
  }
}

async function executeStep(leadId, stepId) {
  const lead = await db('leads').where({ id: leadId }).first();
  if (!lead) return;

  const funnel = await db('funnels').where({ id: lead.funnel_id }).first();
  const funnelJson = funnel.funnel_json;
  const step = funnelJson.steps.find((s) => s.id === stepId);
  if (!step) {
    logger.warn(`Step ${stepId} not found in funnel ${funnel.id}`);
    return;
  }

  await db('leads').where({ id: leadId }).update({ current_step_id: stepId, updated_at: db.fn.now() });

  const conversation = await db('conversations')
    .where({ lead_id: leadId, status: 'active' })
    .orderBy('started_at', 'desc')
    .first();

  const conversationId = conversation ? conversation.id : null;

  switch (step.type) {
    case 'message': {
      const text = substituteVars(step.text, lead.collected_data);
      await sendSMS(lead.business_id, lead.phone, text, conversationId, stepId);
      if (step.next_step) {
        await executeStep(leadId, step.next_step);
      }
      break;
    }

    case 'question': {
      const text = substituteVars(step.text, lead.collected_data);
      await sendSMS(lead.business_id, lead.phone, text, conversationId, stepId);
      await db('leads').where({ id: leadId }).update({ waiting_for_response: true });
      break;
    }

    case 'decision': {
      const data = lead.collected_data;
      let nextStep = step.default_step;

      for (const cond of step.conditions) {
        const val = data[cond.variable];
        let match = false;

        switch (cond.operator) {
          case 'equals': match = String(val) === String(cond.value); break;
          case 'contains': match = String(val).toLowerCase().includes(String(cond.value).toLowerCase()); break;
          case 'gt': match = Number(val) > Number(cond.value); break;
          case 'lt': match = Number(val) < Number(cond.value); break;
        }

        if (match) {
          nextStep = cond.next_step;
          break;
        }
      }

      if (nextStep) {
        await executeStep(leadId, nextStep);
      }
      break;
    }

    case 'calendar_booking': {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const slots = await getAvailability(lead.business_id, {
        start: now.toISOString(),
        end: weekLater.toISOString(),
      }, step.duration_minutes || 30);

      if (slots.length > 0) {
        const text = substituteVars(step.text || 'Pick a time:', lead.collected_data) +
          '\n\n' + formatSlotsForSMS(slots) + '\n\nReply with the number of your preferred time.';
        await sendSMS(lead.business_id, lead.phone, text, conversationId, stepId);

        const data = { ...lead.collected_data, _pending_slots: slots.slice(0, 5) };
        await db('leads').where({ id: leadId }).update({
          waiting_for_response: true,
          collected_data: JSON.stringify(data),
        });
      } else {
        const text = "I don't have any available slots right now. Someone from our team will reach out to schedule.";
        await sendSMS(lead.business_id, lead.phone, text, conversationId, stepId);
        if (step.next_step_declined) {
          await executeStep(leadId, step.next_step_declined);
        }
      }
      break;
    }

    case 'schedule_job': {
      const delayMs = (step.delay_hours || 1) * 60 * 60 * 1000;
      await db('scheduled_jobs').insert({
        business_id: lead.business_id,
        lead_id: leadId,
        job_type: step.job_type,
        run_at: new Date(Date.now() + delayMs),
        payload: JSON.stringify({ funnel_id: lead.funnel_id, step_id: stepId, next_step: step.next_step }),
      });
      break;
    }
  }

  await trackEvent(lead.business_id, 'step_executed', leadId, lead.funnel_id, { step_id: stepId, step_type: step.type });
}

async function trackEvent(businessId, eventType, leadId, funnelId, properties) {
  try {
    await db('analytics_events').insert({
      business_id: businessId,
      event_type: eventType,
      lead_id: leadId,
      funnel_id: funnelId,
      properties: JSON.stringify(properties),
    });
  } catch (err) {
    logger.warn(`Analytics tracking failed: ${err.message}`);
  }
}

module.exports = { startFunnel, processInboundMessage, executeStep };
