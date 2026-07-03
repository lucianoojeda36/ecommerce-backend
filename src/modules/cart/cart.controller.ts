import { Request, Response, NextFunction } from 'express';
import { CartService } from './cart.service';

const cartService = new CartService();

export class CartController {
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await cartService.getCart(req.user!.userId);
      const total = await cartService.getCartTotal(req.user!.userId);
      res.json({ items, total });
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { product_id, quantity } = req.body;
      const item = await cartService.addItem(req.user!.userId, product_id, quantity || 1);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { quantity } = req.body;
      const item = await cartService.updateItemQuantity(req.user!.userId, req.params.id, quantity);
      res.json(item);
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      await cartService.removeItem(req.user!.userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      await cartService.clearCart(req.user!.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
