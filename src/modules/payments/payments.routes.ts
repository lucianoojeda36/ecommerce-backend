import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();
const controller = new PaymentsController();

router.get('/public-key', controller.getPublicKey);
router.post('/create-preference', authenticate, controller.createPreference);
router.post('/webhook', controller.webhook);
router.get('/order/:orderId', authenticate, controller.getPaymentByOrder);

export default router;
