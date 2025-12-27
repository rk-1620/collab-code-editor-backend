// src/routes/projects.js
import { Router } from 'express';
import projectController from '../controllers/projectController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth.authenticate);

router.post('/', projectController.create);
router.get('/', projectController.list);

export default router;
