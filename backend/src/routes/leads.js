const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();
router.use(auth, tenantContext);

router.get('/', async (req, res, next) => {
  try {
    const { status, funnel_id, source, page = 1, limit = 50 } = req.query;
    let query = db('leads').where({ business_id: req.businessId });

    if (status) query = query.where({ status });
    if (funnel_id) query = query.where({ funnel_id });
    if (source) query = query.where({ source });

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [{ count }] = await query.clone().count('id');
    const leads = await query.orderBy('created_at', 'desc').offset(offset).limit(parseInt(limit, 10));

    res.json({ leads, total: parseInt(count, 10), page: parseInt(page, 10) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lead = await db('leads').where({ id: req.params.id, business_id: req.businessId }).first();
    if (!lead) throw new NotFoundError('Lead');

    const messages = await db('messages')
      .where({ lead_id: lead.id })
      .orderBy('created_at', 'asc');

    const appointments = await db('appointments')
      .where({ lead_id: lead.id })
      .orderBy('start_time', 'desc');

    res.json({ ...lead, messages, appointments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
