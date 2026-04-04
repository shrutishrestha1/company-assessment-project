const sql = require('mssql');
const logger = require('../utils/logger');

const dbConfig = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'remit_db',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool;

const connectDB = async () => {
  try {
    pool = await sql.connect(dbConfig);
    logger.info('✅ MsSQL Database connected successfully');
    return pool;
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

const getPool = () => {
  if (!pool) throw new Error('Database not initialized. Call connectDB first.');
  return pool;
};

module.exports = { connectDB, getPool, sql };
