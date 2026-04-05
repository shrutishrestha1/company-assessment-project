const express = require('express');
const { apiRateLimit } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const senderRoutes = require('./routes/senderRoutes');
const receiverRoutes = require('./routes/receiverRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const configRoutes = require('./routes/configRoutes');

const app = express();

app.use((req, res, next) => {
  const allowedOrigin = (process.env.FRONTEND_URL || 'http://localhost:3000').trim();
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

app.use('/api/', apiRateLimit);

app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/senders', senderRoutes);
app.use('/api/receivers', receiverRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'HimalRemit API',
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

module.exports = app;