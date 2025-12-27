// src/routes/auth.js
import { Router } from 'express';
import authController from '../controllers/authController.js';
import validation from '../middleware/validation.js';

const router = Router();

router.post('/login', validation.validate(validation.schemas.login), authController.login);

export default router;
