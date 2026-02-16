const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  // Clean
  await knex('analytics_events').del();
  await knex('webhook_logs').del();
  await knex('scheduled_jobs').del();
  await knex('appointments').del();
  await knex('messages').del();
  await knex('conversations').del();
  await knex('leads').del();
  await knex('funnels').del();
  await knex('users').del();
  await knex('businesses').del();

  // Business
  const [business] = await knex('businesses').insert({
    name: 'Acme Solar',
    industry: 'Solar Energy',
    timezone: 'America/New_York',
    business_hours: JSON.stringify({
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '16:00' },
      saturday: { enabled: false, start: '10:00', end: '14:00' },
      sunday: { enabled: false, start: '10:00', end: '14:00' },
    }),
  }).returning('*');

  // User (password: Hermes@2026!secure)
  const hash = await bcrypt.hash('Hermes@2026!secure', 12);
  await knex('users').insert({
    business_id: business.id,
    email: 'demo@acmesolar.com',
    password_hash: hash,
    name: 'Demo User',
    role: 'owner',
  });

  // Funnel
  const sampleFunnel = {
    entry_step: 'greeting',
    variables: ['interested', 'homeowner', 'budget', 'timeline'],
    steps: [
      { id: 'greeting', type: 'message', text: 'Hi {{name}}! Thanks for your interest in solar panels. I have a few quick questions to see if we can help. 🌞', next_step: 'ask_homeowner' },
      { id: 'ask_homeowner', type: 'question', text: 'Do you own your home?', variable_name: 'homeowner', answer_type: 'boolean', next_step: 'check_homeowner' },
      { id: 'check_homeowner', type: 'decision', conditions: [{ variable: 'homeowner', operator: 'equals', value: 'true', next_step: 'ask_budget' }], default_step: 'not_qualified' },
      { id: 'ask_budget', type: 'question', text: 'Great! What is your approximate monthly electricity bill?', variable_name: 'budget', answer_type: 'number', next_step: 'ask_timeline' },
      { id: 'ask_timeline', type: 'question', text: 'When are you looking to go solar?', variable_name: 'timeline', answer_type: 'choice', choices: ['ASAP', '1-3 months', '3-6 months', 'Just researching'], next_step: 'book_meeting' },
      { id: 'book_meeting', type: 'calendar_booking', text: "Awesome! Let's schedule a free consultation. Here are some available times:", duration_minutes: 30, next_step_booked: 'booked_confirm', next_step_declined: 'followup_later' },
      { id: 'booked_confirm', type: 'message', text: "You're all set! We'll see you at your scheduled time. You'll receive a reminder 24 hours before. Have a great day! ☀️", next_step: null },
      { id: 'not_qualified', type: 'message', text: "Thanks for your interest! Unfortunately, solar panels work best for homeowners. We'll keep you in mind if that changes. Have a great day!", next_step: null },
      { id: 'followup_later', type: 'schedule_job', job_type: 'followup', delay_hours: 24, next_step: 'followup_msg' },
      { id: 'followup_msg', type: 'message', text: 'No worries! If you change your mind about scheduling, just reply here and we can find a time that works.', next_step: null },
    ],
  };

  const [funnel] = await knex('funnels').insert({
    business_id: business.id,
    name: 'Solar Lead Qualification',
    description: 'Qualifies homeowners interested in solar panels and books consultations',
    funnel_json: JSON.stringify(sampleFunnel),
    status: 'active',
    trigger_type: 'new_lead',
    leads_processed: 3,
    leads_converted: 1,
  }).returning('*');

  // Sample leads
  const [lead1] = await knex('leads').insert({
    business_id: business.id,
    funnel_id: funnel.id,
    phone: '+15551234567',
    name: 'Jane Smith',
    email: 'jane@example.com',
    source: 'website',
    status: 'booked',
    collected_data: JSON.stringify({ homeowner: true, budget: 200, timeline: 'ASAP' }),
  }).returning('*');

  const [lead2] = await knex('leads').insert({
    business_id: business.id,
    funnel_id: funnel.id,
    phone: '+15559876543',
    name: 'Bob Jones',
    source: 'facebook',
    status: 'in_progress',
    current_step_id: 'ask_budget',
    waiting_for_response: true,
    collected_data: JSON.stringify({ homeowner: true }),
  }).returning('*');

  // Conversation + messages for lead1
  const [conv1] = await knex('conversations').insert({
    lead_id: lead1.id,
    business_id: business.id,
    funnel_id: funnel.id,
    channel: 'sms',
    status: 'completed',
  }).returning('*');

  await knex('messages').insert([
    { conversation_id: conv1.id, lead_id: lead1.id, direction: 'outbound', body: 'Hi Jane! Thanks for your interest in solar panels.', step_id: 'greeting' },
    { conversation_id: conv1.id, lead_id: lead1.id, direction: 'outbound', body: 'Do you own your home?', step_id: 'ask_homeowner' },
    { conversation_id: conv1.id, lead_id: lead1.id, direction: 'inbound', body: 'Yes I do!' },
    { conversation_id: conv1.id, lead_id: lead1.id, direction: 'outbound', body: 'Great! What is your approximate monthly electricity bill?', step_id: 'ask_budget' },
    { conversation_id: conv1.id, lead_id: lead1.id, direction: 'inbound', body: 'About $200' },
  ]);

  // Appointment
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow.getTime() + 30 * 60 * 1000);

  await knex('appointments').insert({
    business_id: business.id,
    lead_id: lead1.id,
    start_time: tomorrow,
    end_time: tomorrowEnd,
    duration_minutes: 30,
    status: 'scheduled',
  });
};
