import { Router } from 'express';
import { ContactController } from './contact.controller';
import { validate } from '../../core/middleware/validate';
import { contactSchema } from './contact.validation';

const router = Router();
const controller = new ContactController();

router.post('/', validate(contactSchema), controller.send);

export default router;
