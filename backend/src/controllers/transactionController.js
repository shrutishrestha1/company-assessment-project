const { getPool, sql } = require('../config/database');
const { produceTransaction } = require('../kafka/kafkaService');
const { calculateTransaction, generateReferenceNo } = require('../utils/helpers');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const { sender_id, receiver_id, send_amount_jpy, remarks } = req.body;
    const pool = getPool();

    // Validate sender
    const senderResult = await pool.request()
      .input('id', sql.Int, sender_id)
      .query('SELECT id, full_name, is_active FROM senders WHERE id = @id');
    if (!senderResult.recordset.length) return errorResponse(res, 'Sender not found.', 404);
    if (!senderResult.recordset[0].is_active) return errorResponse(res, 'Sender is inactive.', 400);

    // Validate receiver
    const receiverResult = await pool.request()
      .input('id', sql.Int, receiver_id)
      .query('SELECT id, full_name, is_active FROM receivers WHERE id = @id');
    if (!receiverResult.recordset.length) return errorResponse(res, 'Receiver not found.', 404);
    if (!receiverResult.recordset[0].is_active) return errorResponse(res, 'Receiver is inactive.', 400);

    // Calculate amounts
    const calc = calculateTransaction(parseFloat(send_amount_jpy));
    const referenceNo = generateReferenceNo();

    // Insert transaction as 'pending'
    const result = await pool.request()
      .input('reference_no', sql.NVarChar, referenceNo)
      .input('sender_id', sql.Int, sender_id)
      .input('receiver_id', sql.Int, receiver_id)
      .input('send_amount_jpy', sql.Decimal(18, 2), calc.sendAmountJPY)
      .input('forex_rate', sql.Decimal(10, 6), calc.forexRate)
      .input('converted_amount_npr', sql.Decimal(18, 2), calc.convertedAmountNPR)
      .input('service_fee_npr', sql.Decimal(18, 2), calc.serviceFeeNPR)
      .input('total_amount_npr', sql.Decimal(18, 2), calc.totalAmountNPR)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('created_by', sql.Int, req.user.id)
      .query(`
        INSERT INTO transactions (
          reference_no, sender_id, receiver_id, send_amount_jpy, forex_rate,
          converted_amount_npr, service_fee_npr, total_amount_npr, remarks, created_by, updated_by
        )
        OUTPUT INSERTED.*
        VALUES (
          @reference_no, @sender_id, @receiver_id, @send_amount_jpy, @forex_rate,
          @converted_amount_npr, @service_fee_npr, @total_amount_npr, @remarks, @created_by, @created_by
        )
      `);

    const transaction = result.recordset[0];

    // Produce to Kafka
    try {
      await produceTransaction({
        transactionId: transaction.id,
        referenceNo: transaction.reference_no,
        senderId: sender_id,
        senderName: senderResult.recordset[0].full_name,
        receiverId: receiver_id,
        receiverName: receiverResult.recordset[0].full_name,
        sendAmountJPY: calc.sendAmountJPY,
        forexRate: calc.forexRate,
        convertedAmountNPR: calc.convertedAmountNPR,
        serviceFeeNPR: calc.serviceFeeNPR,
        totalAmountNPR: calc.totalAmountNPR,
        remarks: remarks || null,
        createdBy: req.user.id,
      });
    } catch (kafkaError) {
      logger.warn(`Kafka produce failed for ${referenceNo}, transaction still saved: ${kafkaError.message}`);
    }

    return successResponse(res, {
      ...transaction,
      calculation: calc,
    }, 'Transaction created and queued for processing.', 201);
  } catch (error) {
    logger.error('createTransaction error:', error);
    return errorResponse(res, 'Failed to create transaction.', 500);
  }
};

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const {
      page = 1, limit = 10,
      sender_id = '', receiver_id = '',
      date_from = '', date_to = '',
      status = '', reference_no = ''
    } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();

    const request = pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));

    let where = 'WHERE 1=1';
    if (sender_id) { where += ' AND t.sender_id = @sender_id'; request.input('sender_id', sql.Int, sender_id); }
    if (receiver_id) { where += ' AND t.receiver_id = @receiver_id'; request.input('receiver_id', sql.Int, receiver_id); }
    if (date_from) { where += ' AND CAST(t.created_at AS DATE) >= @date_from'; request.input('date_from', sql.Date, new Date(date_from)); }
    if (date_to) { where += ' AND CAST(t.created_at AS DATE) <= @date_to'; request.input('date_to', sql.Date, new Date(date_to)); }
    if (status) { where += ' AND t.status = @status'; request.input('status', sql.NVarChar, status); }
    if (reference_no) { where += ' AND t.reference_no LIKE @reference_no'; request.input('reference_no', sql.NVarChar, `%${reference_no}%`); }

    const countReq = pool.request();
    if (sender_id) countReq.input('sender_id', sql.Int, sender_id);
    if (receiver_id) countReq.input('receiver_id', sql.Int, receiver_id);
    if (date_from) countReq.input('date_from', sql.Date, new Date(date_from));
    if (date_to) countReq.input('date_to', sql.Date, new Date(date_to));
    if (status) countReq.input('status', sql.NVarChar, status);
    if (reference_no) countReq.input('reference_no', sql.NVarChar, `%${reference_no}%`);
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM transactions t ${where}`);

    const result = await request.query(`
      SELECT t.id, t.uuid, t.reference_no, t.send_amount_jpy, t.forex_rate,
             t.converted_amount_npr, t.service_fee_npr, t.total_amount_npr,
             t.status, t.remarks, t.created_at, t.updated_at,
             s.id as sender_id, s.full_name as sender_name, s.email as sender_email,
             r.id as receiver_id, r.full_name as receiver_name, r.phone as receiver_phone,
             r.bank_name, r.bank_account,
             c.full_name as created_by_name
      FROM transactions t
      JOIN senders s ON s.id = t.sender_id
      JOIN receivers r ON r.id = t.receiver_id
      LEFT JOIN users c ON c.id = t.created_by
      ${where}
      ORDER BY t.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return paginatedResponse(res, result.recordset, countResult.recordset[0].total, page, limit);
  } catch (error) {
    logger.error('getTransactions error:', error);
    return errorResponse(res, 'Failed to fetch transactions.', 500);
  }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT t.*, s.full_name as sender_name, s.email as sender_email, s.phone as sender_phone,
               r.full_name as receiver_name, r.phone as receiver_phone, r.bank_name, r.bank_account,
               c.full_name as created_by_name
        FROM transactions t
        JOIN senders s ON s.id = t.sender_id
        JOIN receivers r ON r.id = t.receiver_id
        LEFT JOIN users c ON c.id = t.created_by
        WHERE t.id = @id
      `);
    if (!result.recordset.length) return errorResponse(res, 'Transaction not found.', 404);
    return successResponse(res, result.recordset[0]);
  } catch (error) {
    logger.error('getTransactionById error:', error);
    return errorResponse(res, 'Failed to fetch transaction.', 500);
  }
};

// GET /api/transactions/calculate - preview calculation
const calculateFee = async (req, res) => {
  try {
    const { amount_jpy } = req.query;
    if (!amount_jpy || isNaN(amount_jpy) || parseFloat(amount_jpy) <= 0) {
      return errorResponse(res, 'Valid amount_jpy is required.', 400);
    }
    const calc = calculateTransaction(parseFloat(amount_jpy));
    return successResponse(res, calc, 'Calculation preview.');
  } catch (error) {
    logger.error('calculateFee error:', error);
    return errorResponse(res, 'Calculation failed.', 500);
  }
};

// GET /api/transactions/summary - dashboard stats
const getTransactionSummary = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status='completed' THEN send_amount_jpy ELSE 0 END) as total_jpy_sent,
        SUM(CASE WHEN status='completed' THEN converted_amount_npr ELSE 0 END) as total_npr_converted,
        SUM(CASE WHEN status='completed' THEN service_fee_npr ELSE 0 END) as total_fees_collected
      FROM transactions
    `);
    return successResponse(res, result.recordset[0], 'Summary fetched.');
  } catch (error) {
    logger.error('getTransactionSummary error:', error);
    return errorResponse(res, 'Failed to fetch summary.', 500);
  }
};

module.exports = { createTransaction, getTransactions, getTransactionById, calculateFee, getTransactionSummary };
