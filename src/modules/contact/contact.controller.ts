import { Request, Response, NextFunction } from 'express';
import { ContactService } from './contact.service';

const contactService = new ContactService();

export class ContactController {
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await contactService.sendMessage(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
