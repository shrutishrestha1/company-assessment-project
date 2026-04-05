const { connectConsumer } = require('./kafkaService');
const { getPool, sql } = require('../config/database');
const logger = require('../utils/logger');

const processTransaction = async (data, offset) => {
  const pool = getPool();
  try {
    // Update transaction status to 'completed' and store kafka offset
    const result = await pool.request()
      .input('reference_no', sql.NVarChar, data.referenceNo)
      .input('offset', sql.BigInt, parseInt(offset))
      .query(`
        UPDATE transactions
        SET status = 'completed', kafka_offset = @offset, updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.reference_no, INSERTED.status
        WHERE reference_no = @reference_no AND status = 'pending'
      `);

    if (result.recordset.length > 0) {
      logger.info(`Transaction completed via Kafka: ${data.referenceNo}`);
    } else {
      logger.warn(`Transaction ${data.referenceNo} not found or already processed`);
    }
  } catch (error) {
    logger.error(`Failed to process Kafka transaction ${data.referenceNo}:`, error.message);
    // Mark as failed
    try {
      await pool.request()
        .input('reference_no', sql.NVarChar, data.referenceNo)
        .query(`
          UPDATE transactions SET status = 'failed', updated_at = GETDATE()
          WHERE reference_no = @reference_no AND status = 'pending'
        `);
    } catch (updateError) {
      logger.error('Failed to mark transaction as failed:', updateError.message);
    }
  }
};

const startConsumer = async () => {
  try {
    await connectConsumer(processTransaction);
    logger.info('Kafka consumer processing transactions');
  } catch (error) {
    logger.error('Failed to start Kafka consumer:', error.message);
    logger.warn('Continuing without Kafka consumer (transactions will stay as pending)');
  }
};

module.exports = { startConsumer };
