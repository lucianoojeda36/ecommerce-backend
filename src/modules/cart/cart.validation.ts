import { z } from 'zod';

export const addItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().min(1),
});
