import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate, requireAdmin } from '../../core/middleware/auth';

const router = Router();
const controller = new UsersController();

router.get('/', authenticate, requireAdmin, controller.findAll);
router.get('/:id', authenticate, controller.findById);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, requireAdmin, controller.deactivate);

export default router;
