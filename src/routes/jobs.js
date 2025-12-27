import { Router } from 'express';
import jobController from '../controllers/jobController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth.authenticate);

router.post('/', jobController.submit);
router.get('/workspace/:workspaceId', jobController.listByWorkspace);

export default router;
