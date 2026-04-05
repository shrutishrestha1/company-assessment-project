const { getPool, sql } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

// GET /api/receivers
const getReceivers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', is_active = '' } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();

    const request = pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));

    let where = 'WHERE 1=1';
    if (search) {
      where += ' AND (r.full_name LIKE @search OR r.phone LIKE @search OR r.bank_account LIKE @search)';
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (is_active !== '') {
      where += ' AND r.is_active = @is_active';
      request.input('is_active', sql.Bit, is_active === 'true' ? 1 : 0);
    }

    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    if (is_active !== '') countReq.input('is_active', sql.Bit, is_active === 'true' ? 1 : 0);
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM receivers r ${where}`);

    const result = await request.query(`
      SELECT r.id, r.uuid, r.full_name, r.email, r.phone, r.address, r.country,
             r.bank_name, r.bank_account, r.is_active, r.created_at, r.updated_at,
             c.full_name as created_by_name, u.full_name as updated_by_name
      FROM receivers r
      LEFT JOIN users c ON c.id = r.created_by
      LEFT JOIN users u ON u.id = r.updated_by
      ${where}
      ORDER BY r.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return paginatedResponse(res, result.recordset, countResult.recordset[0].total, page, limit);
  } catch (error) {
    logger.error('getReceivers error:', error);
    return errorResponse(res, 'Failed to fetch receivers.', 500);
  }
};

// GET /api/receivers/:id
const getReceiverById = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT r.*, c.full_name as created_by_name, u.full_name as updated_by_name
        FROM receivers r
        LEFT JOIN users c ON c.id = r.created_by
        LEFT JOIN users u ON u.id = r.updated_by
        WHERE r.id = @id
      `);
    if (!result.recordset.length) return errorResponse(res, 'Receiver not found.', 404);
    return successResponse(res, result.recordset[0]);
  } catch (error) {
    logger.error('getReceiverById error:', error);
    return errorResponse(res, 'Failed to fetch receiver.', 500);
  }
};

// POST /api/receivers
const createReceiver = async (req, res) => {
  try {
    const { full_name, email, phone, address, country, bank_name, bank_account } = req.body;
    const pool = getPool();

    const result = await pool.request()
      .input('full_name', sql.NVarChar, full_name)
      .input('email', sql.NVarChar, email?.toLowerCase().trim() || null)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address || null)
      .input('country', sql.NVarChar, country || 'Nepal')
      .input('bank_name', sql.NVarChar, bank_name || null)
      .input('bank_account', sql.NVarChar, bank_account || null)
      .input('created_by', sql.Int, req.user.id)
      .query(`
        INSERT INTO receivers (full_name, email, phone, address, country, bank_name, bank_account, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@full_name, @email, @phone, @address, @country, @bank_name, @bank_account, @created_by, @created_by)
      `);

    return successResponse(res, result.recordset[0], 'Receiver created successfully.', 201);
  } catch (error) {
    logger.error('createReceiver error:', error);
    return errorResponse(res, 'Failed to create receiver.', 500);
  }
};

// PUT /api/receivers/:id
const updateReceiver = async (req, res) => {
  try {
    const { full_name, phone, address, country, bank_name, bank_account } = req.body;
    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT id FROM receivers WHERE id = @id');
    if (!existing.recordset.length) return errorResponse(res, 'Receiver not found.', 404);

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('full_name', sql.NVarChar, full_name)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address || null)
      .input('country', sql.NVarChar, country || 'Nepal')
      .input('bank_name', sql.NVarChar, bank_name || null)
      .input('bank_account', sql.NVarChar, bank_account || null)
      .input('updated_by', sql.Int, req.user.id)
      .query(`
        UPDATE receivers
        SET full_name=@full_name, phone=@phone, address=@address, country=@country,
            bank_name=@bank_name, bank_account=@bank_account, updated_by=@updated_by, updated_at=GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    return successResponse(res, result.recordset[0], 'Receiver updated successfully.');
  } catch (error) {
    logger.error('updateReceiver error:', error);
    return errorResponse(res, 'Failed to update receiver.', 500);
  }
};

// PATCH /api/receivers/:id/status
const toggleReceiverStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('is_active', sql.Bit, is_active ? 1 : 0)
      .input('updated_by', sql.Int, req.user.id)
      .query(`
        UPDATE receivers SET is_active=@is_active, updated_by=@updated_by, updated_at=GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    if (!result.recordset.length) return errorResponse(res, 'Receiver not found.', 404);
    return successResponse(res, result.recordset[0], `Receiver ${is_active ? 'activated' : 'deactivated'} successfully.`);
  } catch (error) {
    logger.error('toggleReceiverStatus error:', error);
    return errorResponse(res, 'Failed to update receiver status.', 500);
  }
};

// DELETE /api/receivers/:id
const deleteReceiver = async (req, res) => {
  try {
    const pool = getPool();
    const txCheck = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT COUNT(*) as cnt FROM transactions WHERE receiver_id = @id');
    if (txCheck.recordset[0].cnt > 0) {
      return errorResponse(res, 'Cannot delete receiver with existing transactions. Deactivate instead.', 409);
    }
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM receivers OUTPUT DELETED.id WHERE id = @id');
    if (!result.recordset.length) return errorResponse(res, 'Receiver not found.', 404);
    return successResponse(res, null, 'Receiver deleted successfully.');
  } catch (error) {
    logger.error('deleteReceiver error:', error);
    return errorResponse(res, 'Failed to delete receiver.', 500);
  }
};

module.exports = { getReceivers, getReceiverById, createReceiver, updateReceiver, toggleReceiverStatus, deleteReceiver };
