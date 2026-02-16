const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const { validate, schemas } = require('../utils/validators');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();
router.use(auth, tenantContext);

router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    let query = db('appointments')
      .where({ 'appointments.business_id': req.businessId })
      .leftJoin('leads', 'appointments.lead_id', 'leads.id')
      .select('appointments.*', 'leads.name as lead_name', 'leads.phone as lead_phone');

    if (status) query = query.where({ 'appointments.status': status });

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const appointments = await query.orderBy('appointments.start_time', 'desc').offset(offset).limit(parseInt(limit, 10));

    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(schemas.appointmentUpdate), async (req, res, next) => {
  try {
    const [appt] = await db('appointments')
      .where({ id: req.params.id, business_id: req.businessId })
      .update({ status: req.validated.status, updated_at: db.fn.now() })
      .returning('*');
    if (!appt) throw new NotFoundError('Appointment');
    res.json(appt);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
