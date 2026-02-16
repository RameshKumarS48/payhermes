const express = require('express');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const { getTimeSeries } = require('../services/analytics');

const router = express.Router();
router.use(auth, tenantContext);

router.get('/time-series', async (req, res, next) => {
  try {
    const { event_type = 'step_executed', days = 30 } = req.query;
    const data = await getTimeSeries(req.businessId, event_type, parseInt(days, 10));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
