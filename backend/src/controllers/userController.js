const { getPool, sql } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', is_active = '' } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();

    let whereClause = 'WHERE 1=1';
    const request = pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));

    if (search) {
      whereClause += ' AND (u.full_name LIKE @search OR u.email LIKE @search)';
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (role) {
      whereClause += ' AND u.role = @role';
      request.input('role', sql.NVarChar, role);
    }
    if (is_active !== '') {
      whereClause += ' AND u.is_active = @is_active';
      request.input('is_active', sql.Bit, is_active === 'true' ? 1 : 0);
    }

    const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM users u ${whereClause.replace(/@\w+/g, (m) => {
      const map = { '@search': search ? `'%${search}%'` : 'NULL', '@role': `'${role}'`, '@is_active': is_active === 'true' ? '1' : '0' };
      return map[m] || m;
    })}`);

    const result = await request.query(`
      SELECT u.id, u.uuid, u.full_name, u.email, u.phone, u.role, u.is_active,
             u.created_at, u.updated_at,
             c.full_name as created_by_name, up.full_name as updated_by_name
      FROM users u
      LEFT JOIN users c ON c.id = u.created_by
      LEFT JOIN users up ON up.id = u.updated_by
      ${whereClause}
      ORDER BY u.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const countQuery = await pool.request()
      .input('search2', sql.NVarChar, search ? `%${search}%` : null)
      .input('role2', sql.NVarChar, role || null)
      .input('is_active2', sql.Bit, is_active !== '' ? (is_active === 'true' ? 1 : 0) : null)
      .query(`
        SELECT COUNT(*) as total FROM users u
        WHERE 1=1
        ${search ? 'AND (u.full_name LIKE @search2 OR u.email LIKE @search2)' : ''}
        ${role ? 'AND u.role = @role2' : ''}
        ${is_active !== '' ? 'AND u.is_active = @is_active2' : ''}
      `);

    const total = countQuery.recordset[0].total;
    return paginatedResponse(res, result.recordset, total, page, limit);
  } catch (error) {
    logger.error('getUsers error:', error);
    return errorResponse(res, 'Failed to fetch users.', 500);
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT u.id, u.uuid, u.full_name, u.email, u.phone, u.role, u.is_active,
               u.created_at, u.updated_at,
               c.full_name as created_by_name, up.full_name as updated_by_name
        FROM users u
        LEFT JOIN users c ON c.id = u.created_by
        LEFT JOIN users up ON up.id = u.updated_by
        WHERE u.id = @id
      `);
    if (!result.recordset.length) return errorResponse(res, 'User not found.', 404);
    return successResponse(res, result.recordset[0]);
  } catch (error) {
    logger.error('getUserById error:', error);
    return errorResponse(res, 'Failed to fetch user.', 500);
  }
};

// POST /api/users
const createUser = async (req, res) => {
  try {
    const { full_name, email, phone, role } = req.body;
    const pool = getPool();

    const existing = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .query('SELECT id FROM users WHERE email = @email');
    if (existing.recordset.length) return errorResponse(res, 'Email already exists.', 409);

    const result = await pool.request()
      .input('full_name', sql.NVarChar, full_name)
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .input('phone', sql.NVarChar, phone || null)
      .input('role', sql.NVarChar, role || 'operator')
      .input('created_by', sql.Int, req.user.id)
      .query(`
        INSERT INTO users (full_name, email, phone, role, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@full_name, @email, @phone, @role, @created_by, @created_by)
      `);

    return successResponse(res, result.recordset[0], 'User created successfully.', 201);
  } catch (error) {
    logger.error('createUser error:', error);
    return errorResponse(res, 'Failed to create user.', 500);
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { full_name, phone, role } = req.body;
    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT id FROM users WHERE id = @id');
    if (!existing.recordset.length) return errorResponse(res, 'User not found.', 404);

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('full_name', sql.NVarChar, full_name)
      .input('phone', sql.NVarChar, phone || null)
      .input('role', sql.NVarChar, role)
      .input('updated_by', sql.Int, req.user.id)
      .query(`
        UPDATE users
        SET full_name = @full_name, phone = @phone, role = @role,
            updated_by = @updated_by, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    return successResponse(res, result.recordset[0], 'User updated successfully.');
  } catch (error) {
    logger.error('updateUser error:', error);
    return errorResponse(res, 'Failed to update user.', 500);
  }
};

// PATCH /api/users/:id/status
const toggleUserStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    const pool = getPool();

    if (parseInt(req.params.id) === req.user.id) {
      return errorResponse(res, 'Cannot deactivate your own account.', 400);
    }

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('is_active', sql.Bit, is_active ? 1 : 0)
      .input('updated_by', sql.Int, req.user.id)
      .query(`
        UPDATE users SET is_active = @is_active, updated_by = @updated_by, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (!result.recordset.length) return errorResponse(res, 'User not found.', 404);
    const action = is_active ? 'activated' : 'deactivated';
    return successResponse(res, result.recordset[0], `User ${action} successfully.`);
  } catch (error) {
    logger.error('toggleUserStatus error:', error);
    return errorResponse(res, 'Failed to update user status.', 500);
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, toggleUserStatus };
