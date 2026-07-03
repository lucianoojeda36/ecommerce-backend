import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireAdmin } from '../../core/middleware/auth';

const router = Router();
const controller = new AdminController();

router.get('/settings', controller.getSettings);
router.put('/settings', authenticate, requireAdmin, controller.updateSettings);
router.get('/dashboard', authenticate, requireAdmin, controller.getDashboard);

export default router;
