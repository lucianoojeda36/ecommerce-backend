import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { config } from '../../core/config';

const paymentsService = new PaymentsService();

export class PaymentsController {
  async createPreference(req: Request, res: Response, next: NextFunction) {
    try {
      const { order_id } = req.body;
      const result = await paymentsService.createPreference(
        order_id,
        req.user!.userId,
        req.user!.email
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      await paymentsService.handleWebhook(req.body, req.headers, req.query as Record<string, any>);
      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(200).send('OK');
    }
  }

  async getPublicKey(_req: Request, res: Response) {
    res.json({ public_key: config.mercadopago.publicKey });
  }

  async getPaymentByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await paymentsService.getPaymentByOrder(req.params.orderId);
      if (!payment) {
        return res.status(404).json({ error: 'Pago no encontrado' });
      }
      res.json(payment);
    } catch (error) {
      next(error);
    }
  }
}
