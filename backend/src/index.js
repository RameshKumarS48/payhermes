const path = require('path');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const funnelRoutes = require('./routes/funnels');
const leadRoutes = require('./routes/leads');
const appointmentRoutes = require('./routes/appointments');
const webhookRoutes = require('./routes/webhooks');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');

const app = express();

app.set('trust proxy', 1);
app.use(cors({
  origin: env.nodeEnv === 'production' ? true : env.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/funnels', funnelRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

// Serve frontend in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use(errorHandler);

const port = process.env.PORT || env.port;
app.listen(port, '0.0.0.0', () => {
  logger.info(`PayHermes running on port ${port}`);
});

module.exports = app;
