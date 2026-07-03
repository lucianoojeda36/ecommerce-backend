import { Router } from 'express';
import { CartController } from './cart.controller';
import { authenticate } from '../../core/middleware/auth';
import { validate } from '../../core/middleware/validate';
import { addItemSchema, updateItemSchema } from './cart.validation';

const router = Router();
const controller = new CartController();

router.use(authenticate);

router.get('/', controller.getCart);
router.post('/', validate(addItemSchema), controller.addItem);
router.put('/:id', validate(updateItemSchema), controller.updateItem);
router.delete('/:id', controller.removeItem);
router.delete('/', controller.clearCart);

export default router;
