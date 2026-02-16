const { google } = require('googleapis');
const db = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
  );
}

async function getAuthenticatedClient(businessId) {
  const biz = await db('businesses').where({ id: businessId }).first();
  const config = biz.calendar_config || {};
  if (!config.access_token) return null;

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    access_token: config.access_token,
    refresh_token: config.refresh_token,
  });
  return oauth2;
}

async function getAvailability(businessId, dateRange, durationMinutes = 30) {
  const auth = await getAuthenticatedClient(businessId);
  if (!auth) return [];

  const biz = await db('businesses').where({ id: businessId }).first();
  const hours = biz.business_hours || {};

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const freebusy = await calendar.freebusy.query({
      requestBody: {
        timeMin: dateRange.start,
        timeMax: dateRange.end,
        items: [{ id: 'primary' }],
      },
    });

    const busySlots = freebusy.data.calendars.primary.busy || [];
    const slots = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayHours = hours[dayName];
      if (!dayHours || !dayHours.enabled) continue;

      const [startH, startM] = dayHours.start.split(':').map(Number);
      const [endH, endM] = dayHours.end.split(':').map(Number);

      for (let h = startH; h < endH || (h === endH && 0 < endM); ) {
        const slotStart = new Date(d);
        slotStart.setHours(h, h === startH ? startM : 0, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

        if (slotEnd.getHours() > endH || (slotEnd.getHours() === endH && slotEnd.getMinutes() > endM)) break;

        const isBusy = busySlots.some((b) => {
          const bs = new Date(b.start);
          const be = new Date(b.end);
          return slotStart < be && slotEnd > bs;
        });

        if (!isBusy) {
          slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
        }

        h = slotEnd.getHours();
        if (slotEnd.getMinutes() > 0 && h === slotEnd.getHours()) {
          slotStart.setMinutes(slotEnd.getMinutes());
        } else {
          h++;
        }
      }
    }

    return slots;
  } catch (err) {
    logger.error(`Calendar availability error: ${err.message}`);
    return [];
  }
}

async function bookAppointment(businessId, leadId, slot, durationMinutes = 30) {
  const auth = await getAuthenticatedClient(businessId);
  const lead = await db('leads').where({ id: leadId }).first();

  let calendarEventId = null;

  if (auth) {
    try {
      const calendar = google.calendar({ version: 'v3', auth });
      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `Meeting with ${lead.name || lead.phone}`,
          start: { dateTime: slot.start },
          end: { dateTime: slot.end },
        },
      });
      calendarEventId = event.data.id;
    } catch (err) {
      logger.error(`Calendar booking error: ${err.message}`);
    }
  }

  const [appointment] = await db('appointments').insert({
    business_id: businessId,
    lead_id: leadId,
    start_time: slot.start,
    end_time: slot.end,
    duration_minutes: durationMinutes,
    status: 'scheduled',
    calendar_event_id: calendarEventId,
  }).returning('*');

  // Schedule reminders
  const startTime = new Date(slot.start);
  await db('scheduled_jobs').insert([
    {
      business_id: businessId,
      lead_id: leadId,
      job_type: 'reminder_24h',
      run_at: new Date(startTime.getTime() - 24 * 60 * 60 * 1000),
      payload: JSON.stringify({ appointment_id: appointment.id }),
    },
    {
      business_id: businessId,
      lead_id: leadId,
      job_type: 'reminder_1h',
      run_at: new Date(startTime.getTime() - 60 * 60 * 1000),
      payload: JSON.stringify({ appointment_id: appointment.id }),
    },
  ]);

  return appointment;
}

function formatSlotsForSMS(slots) {
  return slots.slice(0, 5).map((s, i) => {
    const d = new Date(s.start);
    return `${i + 1}. ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }).join('\n');
}

module.exports = { getAvailability, bookAppointment, formatSlotsForSMS };
