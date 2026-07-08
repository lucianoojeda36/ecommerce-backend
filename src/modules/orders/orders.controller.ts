import { Request, Response, NextFunction } from 'express';
import { OrdersService } from './orders.service';

const ordersService = new OrdersService();

export class OrdersController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { shipping_address, notes, shipping_cost } = req.body;
      const order = await ordersService.createFromCart(req.user!.userId, shipping_address, notes, shipping_cost);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  async findMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await ordersService.getUserOrders(req.user!.userId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.findById(req.params.id);
      if (req.user!.role !== 'admin' && order.user_id !== req.user!.userId) {
        return res.status(403).json({ error: 'No tienes acceso a esta orden' });
      }
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await ordersService.findAll(page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const order = await ordersService.updateStatus(req.params.id, status);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }
}
