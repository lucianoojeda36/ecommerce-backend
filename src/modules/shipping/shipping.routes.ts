import { Router } from 'express';
import { ShippingController } from './shipping.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();
const controller = new ShippingController();

router.post('/calculate', authenticate, controller.calculate);

export default router;
