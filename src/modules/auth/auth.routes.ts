import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../core/middleware/validate';
import { registerSchema, loginSchema } from './auth.validation';
import { authenticate } from '../../core/middleware/auth';

const router = Router();
const controller = new AuthController();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.get('/profile', authenticate, controller.profile);

export default router;
