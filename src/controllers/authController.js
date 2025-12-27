// src/controllers/authController.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { redis } from '../config/database.js';
import User from '../models/User.js';

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const valid = await User.verifyPassword(email, password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const user = await User.findByEmail(email);
    const jti = crypto.randomUUID();

    const accessToken = jwt.sign({ jti, userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '15m'
    });
    const refreshToken = jwt.sign({ jti }, process.env.REFRESH_SECRET, {
      expiresIn: '7d'
    });

    await redis.setex(
      `session:${jti}`,
      15 * 60,
      JSON.stringify({ id: user.id, email: user.email, role: user.role || 'owner' })
    );

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role || 'owner' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default { login };
