require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { connectProducer } = require('./kafka/kafkaService');
const { startConsumer } = require('./kafka/consumer');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MsSQL
    await connectDB();

    // Connect to Redis
    connectRedis();

    // Connect Kafka producer (non-blocking)
    try {
      await connectProducer();
    } catch (err) {
      logger.warn('Kafka producer unavailable, continuing without it:', err.message);
    }

    // Start Kafka consumer (non-blocking)
    startConsumer().catch((err) =>
      logger.warn('Kafka consumer unavailable:', err.message)
    );

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`HimalRemit API running on http://localhost:${PORT}`);
      logger.info(`Health: http://localhost:${PORT}/health`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  const { disconnectKafka } = require('./kafka/kafkaService');
  await disconnectKafka();
  process.exit(0);
});

startServer();
