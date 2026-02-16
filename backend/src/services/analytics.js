const db = require('../config/database');

async function trackEvent(businessId, eventType, leadId, funnelId, properties = {}) {
  await db('analytics_events').insert({
    business_id: businessId,
    event_type: eventType,
    lead_id: leadId || null,
    funnel_id: funnelId || null,
    properties: JSON.stringify(properties),
  });
}

async function getStats(businessId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [leadsCount] = await db('leads').where('business_id', businessId).where('created_at', '>=', since).count('id');
  const [qualifiedCount] = await db('leads').where('business_id', businessId).where('created_at', '>=', since).whereIn('status', ['qualified', 'booked', 'completed']).count('id');
  const [bookedCount] = await db('appointments').where('business_id', businessId).where('created_at', '>=', since).count('id');
  const [messagesCount] = await db('messages')
    .join('leads', 'messages.lead_id', 'leads.id')
    .where('leads.business_id', businessId)
    .where('messages.created_at', '>=', since)
    .count('messages.id');

  return {
    leads: parseInt(leadsCount.count, 10),
    qualified: parseInt(qualifiedCount.count, 10),
    booked: parseInt(bookedCount.count, 10),
    messages: parseInt(messagesCount.count, 10),
    qualifiedRate: leadsCount.count > 0 ? (qualifiedCount.count / leadsCount.count * 100).toFixed(1) : 0,
    bookedRate: leadsCount.count > 0 ? (bookedCount.count / leadsCount.count * 100).toFixed(1) : 0,
  };
}

async function getTimeSeries(businessId, eventType, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = await db('analytics_events')
    .select(db.raw("date_trunc('day', created_at) as day"))
    .count('id as count')
    .where('business_id', businessId)
    .where('event_type', eventType)
    .where('created_at', '>=', since)
    .groupByRaw("date_trunc('day', created_at)")
    .orderBy('day');

  return rows.map((r) => ({ date: r.day, count: parseInt(r.count, 10) }));
}

module.exports = { trackEvent, getStats, getTimeSeries };
