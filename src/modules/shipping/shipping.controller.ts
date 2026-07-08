import { Request, Response, NextFunction } from 'express';
import { ShippingService } from './shipping.service';

const shippingService = new ShippingService();

export class ShippingController {
  async calculate(req: Request, res: Response, next: NextFunction) {
    try {
      const { province, cart_total } = req.body;
      if (!province) {
        return res.status(400).json({ error: 'La provincia es requerida' });
      }
      const result = await shippingService.calculateShipping(province, cart_total || 0);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
