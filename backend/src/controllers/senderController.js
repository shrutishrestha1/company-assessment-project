const { getPool, sql } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

const buildSenderQuery = (base) => `
  ${base}
  LEFT JOIN users c ON c.id = s.created_by
  LEFT JOIN users u ON u.id = s.updated_by
`;

// GET /api/senders
const getSenders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', is_active = '' } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();

    const request = pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));

    let where = 'WHERE 1=1';
    if (search) {
      where += ' AND (s.full_name LIKE @search OR s.email LIKE @search OR s.phone LIKE @search)';
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (is_active !== '') {
      where += ' AND s.is_active = @is_active';
      request.input('is_active', sql.Bit, is_active === 'true' ? 1 : 0);
    }

    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    if (is_active !== '') countReq.input('is_active', sql.Bit, is_active === 'true' ? 1 : 0);
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM senders s ${where}`);

    const result = await request.query(`
      SELECT s.id, s.uuid, s.full_name, s.email, s.phone, s.address, s.country,
             s.id_type, s.id_number, s.is_active, s.created_at, s.updated_at,
             c.full_name as created_by_name, u.full_name as updated_by_name
      FROM senders s
      LEFT JOIN users c ON c.id = s.created_by
      LEFT JOIN users u ON u.id = s.updated_by
      ${where}
      ORDER BY s.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return paginatedResponse(res, result.recordset, countResult.recordset[0].total, page, limit);
  } catch (error) {
    logger.error('getSenders error:', error);
    return errorResponse(res, 'Failed to fetch senders.', 500);
  }
};

// GET /api/senders/:id
const getSenderById = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT s.*, c.full_name as created_by_name, u.full_name as updated_by_name
        FROM senders s
        LEFT JOIN users c ON c.id = s.created_by
        LEFT JOIN users u ON u.id = s.updated_by
        WHERE s.id = @id
      `);
    if (!result.recordset.length) return errorResponse(res, 'Sender not found.', 404);
    return successResponse(res, result.recordset[0]);
  } catch (error) {
    logger.error('getSenderById error:', error);
    return errorResponse(res, 'Failed to fetch sender.', 500);
  }
};

// POST /api/senders
const createSender = async (req, res) => {
  try {
    const { full_name, email, phone, address, country, id_type, id_number } = req.body;
    const pool = getPool();

    if (email) {
      const existing = await pool.request()
        .input('email', sql.NVarChar, email.toLowerCase().trim())
        .query('SELECT id FROM senders WHERE email = @email');
      if (existing.recordset.length) return errorResponse(res, 'Sender email already exists.', 409);
    }

    const result = await pool.request()
      .input('full_name', sql.NVarChar, full_name)
      .input('email', sql.NVarChar, email?.toLowerCase().trim() || null)
      .input('phone', sql.NVarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('country', sql.NVarChar, country || 'Japan')
      .input('id_type', sql.NVarChar, id_type || null)
      .input('id_number', sql.NVarChar, id_number || null)
      .input('created_by', sql.Int, req.user.id)
      .query(`
        INSERT INTO senders (full_name, email, phone, address, country, id_type, id_number, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@full_name, @email, @phone, @address, @country, @id_type, @id_number, @created_by, @created_by)
      `);

    return successResponse(res, result.recordset[0], 'Sender created successfully.', 201);
  } catch (error) {
    logger.error('createSender error:', error);
    return errorResponse(res, 'Failed to create sender.', 500);
  }
};

// PUT /api/senders/:id
const updateSender = async (req, res) => {
  try {
    const { full_name, phone, address, country, id_type, id_number } = req.body;
    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT id FROM senders WHERE id = @id');
    if (!existing.recordset.length) return errorResponse(res, 'Sender not found.', 404);

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('full_name', sql.NVarChar, full_name)
      .input('phone', sql.NVarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('country', sql.NVarChar, country || 'Japan')
      .input('id_type', sql.NVarChar, id_type || null)
      .input('id_number', sql.NVarChar, id_number || null)
      .input('updated_by', sql.Int, req.user.id)
      .query(`
        UPDATE senders
        SET full_name=@full_name, phone=@phone, address=@address, country=@country,
            id_type=@id_type, id_number=@id_number, updated_by=@updated_by, updated_at=GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    return successResponse(res, result.recordset[0], 'Sender updated successfully.');
  } catch (error) {
    logger.error('updateSender error:', error);
    return errorResponse(res, 'Failed to update sender.', 500);
  }
};

// PATCH /api/senders/:id/status
const toggleSenderStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('is_active', sql.Bit, is_active ? 1 : 0)
      .input('updated_by', sql.Int, req.user.id)
      .query(`
        UPDATE senders SET is_active=@is_active, updated_by=@updated_by, updated_at=GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    if (!result.recordset.length) return errorResponse(res, 'Sender not found.', 404);
    return successResponse(res, result.recordset[0], `Sender ${is_active ? 'activated' : 'deactivated'} successfully.`);
  } catch (error) {
    logger.error('toggleSenderStatus error:', error);
    return errorResponse(res, 'Failed to update sender status.', 500);
  }
};

// DELETE /api/senders/:id
const deleteSender = async (req, res) => {
  try {
    const pool = getPool();
    const txCheck = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT COUNT(*) as cnt FROM transactions WHERE sender_id = @id');
    if (txCheck.recordset[0].cnt > 0) {
      return errorResponse(res, 'Cannot delete sender with existing transactions. Deactivate instead.', 409);
    }
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM senders OUTPUT DELETED.id WHERE id = @id');
    if (!result.recordset.length) return errorResponse(res, 'Sender not found.', 404);
    return successResponse(res, null, 'Sender deleted successfully.');
  } catch (error) {
    logger.error('deleteSender error:', error);
    return errorResponse(res, 'Failed to delete sender.', 500);
  }
};

module.exports = { getSenders, getSenderById, createSender, updateSender, toggleSenderStatus, deleteSender };
