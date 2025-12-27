import { pool } from '../config/database.js';

export default class Workspace {
  static async create(projectId, name) {
    const { rows } = await pool.query(
      `INSERT INTO workspaces (project_id, name)
       VALUES ($1, $2) RETURNING *`,
      [projectId, name]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT w.*, p.name AS project_name
       FROM workspaces w
       JOIN projects p ON w.project_id = p.id
       WHERE w.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async listByProject(projectId) {
    const { rows } = await pool.query(
      `SELECT * FROM workspaces
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );
    return rows;
  }

  static async addMember(workspaceId, userId, role) {
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [workspaceId, userId, role]
    );
  }

  static async getMembers(workspaceId) {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, wm.role
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1`,
      [workspaceId]
    );
    return rows;
  }

  static async userRole(workspaceId, userId) {
    const { rows } = await pool.query(
      `SELECT role FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );
    return rows[0]?.role || null;
  }
}
