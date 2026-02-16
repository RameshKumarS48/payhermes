exports.up = async function (knex) {
  // 1. businesses
  await knex.schema.createTable('businesses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 200).notNullable();
    t.string('industry', 100);
    t.string('timezone').defaultTo('America/New_York');
    t.jsonb('settings').defaultTo('{}');
    t.jsonb('messaging_config').defaultTo('{}');
    t.jsonb('calendar_config').defaultTo('{}');
    t.jsonb('business_hours').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. users
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    t.string('email', 255).notNullable();
    t.string('password_hash', 255).notNullable();
    t.string('name', 200).notNullable();
    t.string('role', 50).defaultTo('owner');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['email']);
    t.index('business_id');
  });

  // 3. funnels
  await knex.schema.createTable('funnels', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    t.string('name', 200).notNullable();
    t.text('description');
    t.jsonb('funnel_json').notNullable();
    t.string('status', 20).defaultTo('draft');
    t.string('trigger_type', 50).defaultTo('new_lead');
    t.integer('leads_processed').defaultTo(0);
    t.integer('leads_converted').defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.index('business_id');
    t.index('status');
  });

  // 4. leads
  await knex.schema.createTable('leads', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    t.uuid('funnel_id').references('id').inTable('funnels').onDelete('SET NULL');
    t.string('phone', 20).notNullable();
    t.string('name', 200);
    t.string('email', 255);
    t.string('source', 100);
    t.string('status', 30).defaultTo('new');
    t.jsonb('collected_data').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.string('current_step_id');
    t.boolean('waiting_for_response').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.index('business_id');
    t.index('phone');
    t.index('status');
    t.index(['business_id', 'phone']);
  });

  // 5. conversations
  await knex.schema.createTable('conversations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
    t.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    t.uuid('funnel_id').references('id').inTable('funnels').onDelete('SET NULL');
    t.string('channel', 20).defaultTo('sms');
    t.string('status', 20).defaultTo('active');
    t.timestamp('started_at').defaultTo(knex.fn.now());
    t.timestamp('ended_at');
    t.index('lead_id');
    t.index('business_id');
  });

  // 6. messages
  await knex.schema.createTable('messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
    t.string('direction', 10).notNullable(); // inbound | outbound
    t.text('body').notNullable();
    t.string('channel', 20).defaultTo('sms');
    t.string('status', 20).defaultTo('sent');
    t.string('external_id'); // Twilio SID
    t.string('step_id');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('conversation_id');
    t.index('lead_id');
    t.index('external_id');
  });

  // 7. appointments
  await knex.schema.createTable('appointments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    t.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
    t.timestamp('start_time').notNullable();
    t.timestamp('end_time').notNullable();
    t.integer('duration_minutes').defaultTo(30);
    t.string('status', 20).defaultTo('scheduled');
    t.string('calendar_event_id');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.index('business_id');
    t.index('lead_id');
    t.index('status');
    t.index('start_time');
  });

  // 8. scheduled_jobs
  await knex.schema.createTable('scheduled_jobs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    t.uuid('lead_id').references('id').inTable('leads').onDelete('CASCADE');
    t.string('job_type', 50).notNullable();
    t.jsonb('payload').defaultTo('{}');
    t.timestamp('run_at').notNullable();
    t.string('status', 20).defaultTo('pending');
    t.integer('attempts').defaultTo(0);
    t.text('last_error');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('completed_at');
    t.index('status');
    t.index('run_at');
  });

  // 9. webhook_logs
  await knex.schema.createTable('webhook_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('business_id').references('id').inTable('businesses').onDelete('SET NULL');
    t.string('event_type', 100).notNullable();
    t.string('source', 100);
    t.jsonb('payload').defaultTo('{}');
    t.integer('status_code');
    t.text('response');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('business_id');
    t.index('event_type');
  });

  // 10. analytics_events
  await knex.schema.createTable('analytics_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    t.string('event_type', 100).notNullable();
    t.uuid('lead_id').references('id').inTable('leads').onDelete('SET NULL');
    t.uuid('funnel_id').references('id').inTable('funnels').onDelete('SET NULL');
    t.jsonb('properties').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('business_id');
    t.index('event_type');
    t.index('created_at');
  });
};

exports.down = async function (knex) {
  const tables = [
    'analytics_events', 'webhook_logs', 'scheduled_jobs', 'appointments',
    'messages', 'conversations', 'leads', 'funnels', 'users', 'businesses',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
