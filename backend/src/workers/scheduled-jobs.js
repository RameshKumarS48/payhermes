const Queue = require('bull');
const db = require('../config/database');
const env = require('../config/env');
const { sendSMS } = require('../services/messaging');
const { executeStep } = require('../services/conversation-engine');
const logger = require('../utils/logger');

const jobQueue = new Queue('scheduled-jobs', env.redisUrl, {
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
});

jobQueue.process(async (job) => {
  const { scheduledJobId } = job.data;
  const sj = await db('scheduled_jobs').where({ id: scheduledJobId }).first();
  if (!sj || sj.status !== 'pending') return;

  await db('scheduled_jobs').where({ id: sj.id }).update({ status: 'processing', attempts: sj.attempts + 1 });

  try {
    switch (sj.job_type) {
      case 'followup': {
        const payload = sj.payload;
        if (payload.next_step && sj.lead_id) {
          await executeStep(sj.lead_id, payload.next_step);
        }
        break;
      }

      case 'reminder_24h':
      case 'reminder_1h': {
        const payload = sj.payload;
        const appt = await db('appointments').where({ id: payload.appointment_id }).first();
        if (!appt || appt.status === 'cancelled') break;

        const lead = await db('leads').where({ id: sj.lead_id }).first();
        if (!lead) break;

        const when = sj.job_type === 'reminder_24h' ? 'tomorrow' : 'in 1 hour';
        const time = new Date(appt.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const text = `Reminder: You have an appointment ${when} at ${time}. Reply CANCEL to cancel.`;
        await sendSMS(sj.business_id, lead.phone, text);
        break;
      }

      case 'no_response_check': {
        const lead = await db('leads').where({ id: sj.lead_id }).first();
        if (!lead || !lead.waiting_for_response) break;

        const lastMsg = await db('messages')
          .where({ lead_id: lead.id, direction: 'inbound' })
          .orderBy('created_at', 'desc')
          .first();

        const hoursSinceContact = lastMsg
          ? (Date.now() - new Date(lastMsg.created_at).getTime()) / 3600000
          : 24;

        if (hoursSinceContact > 2) {
          await sendSMS(sj.business_id, lead.phone, "Hey! Just checking in — did you get my last message?");
        }
        break;
      }
    }

    await db('scheduled_jobs').where({ id: sj.id }).update({ status: 'completed', completed_at: db.fn.now() });
  } catch (err) {
    logger.error(`Job ${sj.id} failed: ${err.message}`);
    await db('scheduled_jobs').where({ id: sj.id }).update({ status: sj.attempts + 1 >= 3 ? 'failed' : 'pending', last_error: err.message });
    throw err;
  }
});

// Poll for due jobs every 30 seconds
async function pollJobs() {
  try {
    const dueJobs = await db('scheduled_jobs')
      .where({ status: 'pending' })
      .where('run_at', '<=', new Date())
      .where('attempts', '<', 3)
      .limit(10);

    for (const sj of dueJobs) {
      await jobQueue.add({ scheduledJobId: sj.id });
    }
  } catch (err) {
    logger.error(`Job polling error: ${err.message}`);
  }
}

setInterval(pollJobs, 30000);

module.exports = { jobQueue, pollJobs };
