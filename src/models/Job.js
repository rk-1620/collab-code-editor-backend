// src/models/Job.js
import { pool } from '../config/database.js';

export default class Job {
  static async create(workspaceId, input, idempotencyKey) {
    const { rows } = await pool.query(
      `INSERT INTO jobs (workspace_id, input_json, idempotency_key)
       VALUES ($1, $2, $3) RETURNING *`,
      [workspaceId, JSON.stringify(input), idempotencyKey]
    );
    return rows[0];
  }

  static async findByIdempotency(key) {
    const { rows } = await pool.query(
      'SELECT * FROM jobs WHERE idempotency_key = $1',
      [key]
    );
    return rows[0];
  }

  static async findByWorkspace(workspaceId) {
    const { rows } = await pool.query(
      'SELECT * FROM jobs WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 50',
      [workspaceId]
    );
    return rows;
  }
}
