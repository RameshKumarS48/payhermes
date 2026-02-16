const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const { validate, schemas } = require('../utils/validators');
const { generateFunnel } = require('../services/ai-funnel-generator');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();
router.use(auth, tenantContext);

router.post('/generate', validate(schemas.funnelGenerate), async (req, res, next) => {
  try {
    const { prompt, name } = req.validated;
    const funnelJson = await generateFunnel(prompt);

    const [funnel] = await db('funnels').insert({
      business_id: req.businessId,
      name: name || `AI Funnel - ${new Date().toLocaleDateString()}`,
      description: prompt,
      funnel_json: JSON.stringify(funnelJson),
      status: 'draft',
    }).returning('*');

    res.status(201).json(funnel);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const funnels = await db('funnels')
      .where({ business_id: req.businessId })
      .whereNot({ status: 'archived' })
      .orderBy('created_at', 'desc');
    res.json(funnels);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const funnel = await db('funnels').where({ id: req.params.id, business_id: req.businessId }).first();
    if (!funnel) throw new NotFoundError('Funnel');
    res.json(funnel);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(schemas.funnelCreate), async (req, res, next) => {
  try {
    const [funnel] = await db('funnels').insert({
      business_id: req.businessId,
      ...req.validated,
      funnel_json: JSON.stringify(req.validated.funnel_json),
    }).returning('*');
    res.status(201).json(funnel);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(schemas.funnelUpdate), async (req, res, next) => {
  try {
    const updates = { ...req.validated, updated_at: db.fn.now() };
    if (updates.funnel_json) updates.funnel_json = JSON.stringify(updates.funnel_json);

    const [funnel] = await db('funnels')
      .where({ id: req.params.id, business_id: req.businessId })
      .update(updates)
      .returning('*');
    if (!funnel) throw new NotFoundError('Funnel');
    res.json(funnel);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [funnel] = await db('funnels')
      .where({ id: req.params.id, business_id: req.businessId })
      .update({ status: 'archived', updated_at: db.fn.now() })
      .returning('*');
    if (!funnel) throw new NotFoundError('Funnel');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
