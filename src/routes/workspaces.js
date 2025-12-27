import { Router } from 'express';
import workspaceController from '../controllers/workspaceController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth.authenticate);

router.post('/', workspaceController.create);
router.get('/project/:projectId', workspaceController.listByProject);
router.post('/invite', workspaceController.invite);
router.get('/:id/members', workspaceController.members);

export default router;
