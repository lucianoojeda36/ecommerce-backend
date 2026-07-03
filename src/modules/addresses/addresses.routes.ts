import { Router } from 'express';
import { AddressesController } from './addresses.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();
const controller = new AddressesController();

router.use(authenticate);

router.get('/', controller.findByUser);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
