const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const { getStats } = require('../services/analytics');

const router = express.Router();
router.use(auth, tenantContext);

router.get('/', async (req, res, next) => {
  try {
    const stats = await getStats(req.businessId, 7);

    const recentLeads = await db('leads')
      .where({ business_id: req.businessId })
      .orderBy('created_at', 'desc')
      .limit(10);

    const upcomingAppointments = await db('appointments')
      .where({ business_id: req.businessId })
      .where('start_time', '>=', new Date())
      .whereIn('status', ['scheduled', 'confirmed'])
      .leftJoin('leads', 'appointments.lead_id', 'leads.id')
      .select('appointments.*', 'leads.name as lead_name', 'leads.phone as lead_phone')
      .orderBy('start_time', 'asc')
      .limit(5);

    const funnelStats = await db('funnels')
      .where({ business_id: req.businessId, status: 'active' })
      .select('id', 'name', 'leads_processed', 'leads_converted');

    res.json({ stats, recentLeads, upcomingAppointments, funnelStats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
