import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { authenticate, requireAdmin } from '../../core/middleware/auth';
import { validate } from '../../core/middleware/validate';
import { createOrderSchema, updateStatusSchema } from './orders.validation';

const router = Router();
const controller = new OrdersController();

// Customer
router.post('/', authenticate, validate(createOrderSchema), controller.create);
router.get('/me', authenticate, controller.findMyOrders);
router.get('/:id', authenticate, controller.findById);

// Admin
router.get('/', authenticate, requireAdmin, controller.findAll);
router.put('/:id/status', authenticate, requireAdmin, validate(updateStatusSchema), controller.updateStatus);

export default router;
