// src/models/Project.js
import { pool } from '../config/database.js';

export default class Project {
  static async create(ownerId, name) {
    const { rows } = await pool.query(
      'INSERT INTO projects (owner_id, name) VALUES ($1, $2) RETURNING *',
      [ownerId, name]
    );
    return rows[0];
  }

  static async findByOwner(ownerId) {
    const { rows } = await pool.query(
      'SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC',
      [ownerId]
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return rows[0];
  }
}
