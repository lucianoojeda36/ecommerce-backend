import { z } from 'zod';

export const createOrderSchema = z.object({
  shipping_address: z.object({
    street: z.string(),
    number: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip_code: z.string().optional(),
    country: z.string().default('Argentina'),
  }),
  notes: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']),
});
