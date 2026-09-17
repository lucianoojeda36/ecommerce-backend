import { Request, Response, NextFunction } from 'express';
import { ShippingService, DeliveryMethod } from './shipping.service';
import { CartService } from '../cart/cart.service';

const shippingService = new ShippingService();
const cartService = new CartService();
const DELIVERY_METHODS: DeliveryMethod[] = ['domicilio', 'sucursal'];

export class ShippingController {
  async calculate(req: Request, res: Response, next: NextFunction) {
    try {
      const { zip_code, cart_total, delivery_method } = req.body;
      if (!zip_code) {
        return res.status(400).json({ error: 'El código postal es requerido' });
      }
      if (delivery_method && !DELIVERY_METHODS.includes(delivery_method)) {
        return res.status(400).json({ error: 'delivery_method inválido. Valores: domicilio, sucursal' });
      }

      const userId = req.user!.userId;
      const cartItems = await cartService.getCart(userId);

      const result = await shippingService.calculateShippingOCA(
        zip_code,
        cart_total || 0,
        cartItems.map(item => ({ quantity: item.quantity, weight_kg: item.weight_kg })),
        delivery_method || 'domicilio'
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
