import { Request, Response, NextFunction } from 'express';
import { MessagesService } from './messages.service';

const messagesService = new MessagesService();

export class MessagesController {
  async getByOrderId(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await messagesService.getByOrderId(req.params.id);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = req.body;
      const senderRole = req.user!.role === 'admin' ? 'admin' : 'customer';
      const message = await messagesService.create(
        req.params.id,
        req.user!.userId,
        senderRole,
        content
      );
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await messagesService.markAsRead(req.params.id, req.user!.userId);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await messagesService.markAllAsRead(req.user!.userId, req.user!.role);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await messagesService.getUnreadCount(
        req.user!.userId,
        req.user!.role
      );
      res.json({ count });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const counts = await messagesService.getUnreadByOrder(
        req.user!.userId,
        req.user!.role
      );
      res.json(counts);
    } catch (error) {
      next(error);
    }
  }
}
