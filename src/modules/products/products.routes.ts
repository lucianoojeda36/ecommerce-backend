import { Router } from 'express';
import { ProductsController } from './products.controller';
import { validate } from '../../core/middleware/validate';
import { createProductSchema, updateProductSchema, createCategorySchema } from './products.validation';
import { authenticate, requireAdmin, optionalAuth } from '../../core/middleware/auth';
import { upload } from '../../core/utils/upload';

const router = Router();
const controller = new ProductsController();

// Public
router.get('/', optionalAuth, controller.findAll);
router.get('/:slug', optionalAuth, controller.findBySlug);

// Admin
router.post('/', authenticate, requireAdmin, validate(createProductSchema), controller.create);
router.put('/:id', authenticate, requireAdmin, validate(updateProductSchema), controller.update);
router.delete('/:id', authenticate, requireAdmin, controller.delete);
router.post('/:id/images', authenticate, requireAdmin, upload.array('images', 10), controller.uploadImages);
router.delete('/:id/images', authenticate, requireAdmin, controller.removeImage);

// Categories
router.get('/c/list/all', controller.getCategories);
router.post('/c', authenticate, requireAdmin, validate(createCategorySchema), controller.createCategory);
router.put('/c/:id', authenticate, requireAdmin, controller.updateCategory);
router.post('/c/:id/image', authenticate, requireAdmin, upload.single('image'), controller.uploadCategoryImage);
router.delete('/c/:id', authenticate, requireAdmin, controller.deleteCategory);

export default router;
