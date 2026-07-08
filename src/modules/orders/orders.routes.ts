import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { MessagesController } from '../messages/messages.controller';
import { authenticate, requireAdmin } from '../../core/middleware/auth';
import { validate } from '../../core/middleware/validate';
import { createOrderSchema, updateStatusSchema } from './orders.validation';

const router = Router();
const controller = new OrdersController();
const messagesController = new MessagesController();

// Customer
router.post('/', authenticate, validate(createOrderSchema), controller.create);
router.get('/me', authenticate, controller.findMyOrders);

// Unread message counts (must be before /:id routes)
router.get('/messages/unread', authenticate, messagesController.getUnreadCount);
router.get('/messages/unread/by-order', authenticate, messagesController.getUnreadByOrder);
router.put('/messages/read-all', authenticate, messagesController.markAllAsRead);

router.get('/:id', authenticate, controller.findById);

// Admin
router.get('/', authenticate, requireAdmin, controller.findAll);
router.put('/:id/status', authenticate, requireAdmin, validate(updateStatusSchema), controller.updateStatus);

// Order Messages
router.get('/:id/messages', authenticate, messagesController.getByOrderId);
router.post('/:id/messages', authenticate, messagesController.create);
router.put('/:id/messages/read', authenticate, messagesController.markAsRead);

export default router;
