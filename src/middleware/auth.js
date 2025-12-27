// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { redis } from '../config/database.js';

const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = await redis.get(`session:${decoded.jti}`);
    if (!session) return res.status(401).json({ error: 'Invalid session' });

    req.user = JSON.parse(session);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole =
  (roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };

export default { authenticate, requireRole };
