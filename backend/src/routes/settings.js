const express = require('express');
const crypto = require('crypto');
const db = require('../config/database');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const { validate, schemas } = require('../utils/validators');

const router = express.Router();
router.use(auth, tenantContext);

// Messaging config
router.get('/messaging', async (req, res, next) => {
  try {
    const biz = await db('businesses').where({ id: req.businessId }).first();
    const config = biz.messaging_config || {};
    res.json({
      twilio_account_sid: config.twilio_account_sid || '',
      twilio_phone_number: config.twilio_phone_number || '',
      whatsapp_enabled: config.whatsapp_enabled || false,
      configured: !!config.twilio_account_sid,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/messaging', validate(schemas.messagingSettings), async (req, res, next) => {
  try {
    const config = req.validated;
    await db('businesses').where({ id: req.businessId }).update({
      messaging_config: JSON.stringify(config),
      updated_at: db.fn.now(),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Business hours
router.get('/business-hours', async (req, res, next) => {
  try {
    const biz = await db('businesses').where({ id: req.businessId }).first();
    res.json({ timezone: biz.timezone, hours: biz.business_hours || {} });
  } catch (err) {
    next(err);
  }
});

router.put('/business-hours', validate(schemas.businessHours), async (req, res, next) => {
  try {
    const { timezone, hours } = req.validated;
    await db('businesses').where({ id: req.businessId }).update({
      timezone,
      business_hours: JSON.stringify(hours),
      updated_at: db.fn.now(),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Calendar
router.post('/calendar/connect', async (req, res, next) => {
  try {
    const { access_token, refresh_token } = req.body;
    await db('businesses').where({ id: req.businessId }).update({
      calendar_config: JSON.stringify({ access_token, refresh_token, connected: true }),
      updated_at: db.fn.now(),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/calendar/availability', async (req, res, next) => {
  try {
    const biz = await db('businesses').where({ id: req.businessId }).first();
    const calConfig = biz.calendar_config || {};
    if (!calConfig.connected) {
      return res.json({ connected: false, slots: [] });
    }
    // Placeholder — real implementation uses Google Calendar freebusy
    res.json({ connected: true, slots: [] });
  } catch (err) {
    next(err);
  }
});

// API Key management
router.get('/api-key', async (req, res, next) => {
  try {
    const biz = await db('businesses').where({ id: req.businessId }).first();
    res.json({ api_key: biz.api_key || null });
  } catch (err) {
    next(err);
  }
});

router.post('/api-key/generate', async (req, res, next) => {
  try {
    const apiKey = 'ph_' + crypto.randomBytes(24).toString('hex');
    await db('businesses').where({ id: req.businessId }).update({ api_key: apiKey, updated_at: db.fn.now() });
    res.json({ api_key: apiKey });
  } catch (err) {
    next(err);
  }
});

// Meta (Facebook/Instagram) integration config
router.get('/meta', async (req, res, next) => {
  try {
    const biz = await db('businesses').where({ id: req.businessId }).first();
    const settings = biz.settings || {};
    res.json({
      meta_page_id: settings.meta_page_id || '',
      meta_access_token_set: !!settings.meta_config?.access_token,
      webhook_url: `${process.env.FRONTEND_URL?.replace('5173', '3001') || 'https://yourserver.com'}/api/webhooks/meta-leadgen`,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/meta', async (req, res, next) => {
  try {
    const { meta_page_id, meta_access_token } = req.body;
    const biz = await db('businesses').where({ id: req.businessId }).first();
    const settings = biz.settings || {};

    settings.meta_page_id = meta_page_id;
    settings.meta_config = { access_token: meta_access_token };

    await db('businesses').where({ id: req.businessId }).update({
      settings: JSON.stringify(settings),
      updated_at: db.fn.now(),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
