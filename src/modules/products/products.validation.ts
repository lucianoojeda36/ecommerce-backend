import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  compare_price: z.number().positive().optional(),
  category_id: z.string().uuid().optional(),
  stock: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  weight_kg: z.number().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
});
