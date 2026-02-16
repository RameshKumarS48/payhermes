const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const env = require('../config/env');
const { validate, schemas } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');
const { AppError } = require('../utils/errors');

const router = express.Router();

router.use(authLimiter);

router.post('/register', validate(schemas.register), async (req, res, next) => {
  try {
    const { business_name, industry, email, password, name } = req.validated;

    const existing = await db('users').where({ email }).first();
    if (existing) throw new AppError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.transaction(async (trx) => {
      const [business] = await trx('businesses').insert({ name: business_name, industry }).returning('*');
      const [user] = await trx('users').insert({
        business_id: business.id,
        email,
        password_hash: passwordHash,
        name,
        role: 'owner',
      }).returning('*');
      return { business, user };
    });

    const token = jwt.sign(
      { userId: result.user.id, businessId: result.business.id, role: 'owner' },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
      business: { id: result.business.id, name: result.business.name },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.validated;

    const user = await db('users').where({ email }).first();
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const business = await db('businesses').where({ id: user.business_id }).first();

    const token = jwt.sign(
      { userId: user.id, businessId: user.business_id, role: user.role },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      business: { id: business.id, name: business.name },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
