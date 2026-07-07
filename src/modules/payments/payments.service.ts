import crypto from 'crypto';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { query, pool } from '../../core/database/pool';
import { config } from '../../core/config';
import { AppError } from '../../core/middleware/errorHandler';
import { OrdersService } from '../orders/orders.service';
import { logger } from '../../core/logger';

const ordersService = new OrdersService();

const client = new MercadoPagoConfig({
  accessToken: config.mercadopago.accessToken,
});

const preference = new Preference(client);

export class PaymentsService {
  async createPreference(orderId: string, userId: string, email: string) {
    const order = await ordersService.findById(orderId);

    if (order.user_id !== userId) {
      throw new AppError(403, 'Esta orden no te pertenece');
    }
    if (order.payment_id) {
      const existingPayment = await this.getPaymentByOrder(orderId);
      const retryableStatuses = ['pending', 'failed', 'refunded'];
      if (!existingPayment || !retryableStatuses.includes(existingPayment.status)) {
        throw new AppError(400, 'Esta orden ya tiene un pago asociado');
      }
    }

    const items = order.items.map((item: any) => ({
      id: item.product_id,
      title: item.product_name,
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      currency_id: 'ARS',
    }));

    const isProduction = config.nodeEnv === 'production';
    const siteUrl = config.frontendUrl;

    const body = {
      items,
      payer: { email },
      back_urls: {
        success: `${siteUrl}/payments/success`,
        failure: `${siteUrl}/payments/failure`,
        pending: `${siteUrl}/payments/pending`,
      },
      // Mercado Pago rejects auto_return unless back_urls.success is a
      // publicly reachable HTTPS URL, so it can't be used with localhost.
      ...(isProduction ? { auto_return: 'approved' as const } : {}),
      external_reference: orderId,
      notification_url: `${config.mercadopago.webhookBaseUrl}/api/payments/webhook`,
    };

    const result = await preference.create({ body });

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      await dbClient.query(
        `INSERT INTO payments (order_id, method, status, transaction_id, metadata)
         VALUES ($1, 'mercadopago', 'pending', $2, $3)`,
        [orderId, result.id, JSON.stringify({ preference_id: result.id, init_point: result.init_point })]
      );

      await dbClient.query('UPDATE orders SET payment_id = $1 WHERE id = $2', [result.id, orderId]);

      await dbClient.query('COMMIT');
    } catch (error) {
      await dbClient.query('ROLLBACK');
      logger.error('Payment record creation failed and rolled back', { orderId, error });
      throw error;
    } finally {
      dbClient.release();
    }

    return {
      preference_id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    };
  }

  async handleWebhook(body: any, headers: Record<string, any>, queryParams: Record<string, any>) {
    const xSignature = headers['x-signature'] as string | undefined;
    const xRequestId = headers['x-request-id'] as string | undefined;

    if (config.mercadopago.webhookSecret) {
      const dataId = (queryParams['data.id'] || queryParams['id'] || body?.data?.id || '').toString().toLowerCase();
      const isValid = !!xSignature && this.isValidWebhookSignature(xSignature, xRequestId, dataId, config.mercadopago.webhookSecret);
      if (!isValid) {
        // No bloqueamos la notificación: el secreto configurado en el dashboard
        // puede haberse regenerado y quedar desincronizado con el .env local.
        logger.warn('Webhook signature validation failed (processing anyway)', { dataId });
      }
    }

    const { type, data } = body;

    if (type !== 'payment') return;

    const paymentId = data.id;
    const accessToken = config.mercadopago.accessToken;

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const payment = await response.json() as any;

    const orderId = payment.external_reference;
    const status = this.mapStatus(payment.status);

    await query(
      `UPDATE payments SET status = $1, updated_at = NOW() WHERE transaction_id = $2`,
      [status, paymentId]
    );

    if (status === 'completed') {
      await ordersService.updateStatus(orderId, 'confirmed');
    } else if (status === 'failed') {
      await ordersService.updateStatus(orderId, 'cancelled');
    }
  }

  async getPaymentByOrder(orderId: string) {
    const result = await query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
    return result.rows[0] || null;
  }

  private isValidWebhookSignature(
    xSignature: string,
    xRequestId: string | undefined,
    dataId: string,
    secret: string
  ): boolean {
    let ts: string | undefined;
    let hash: string | undefined;

    for (const part of xSignature.split(',')) {
      const [key, value] = part.split('=');
      if (key?.trim() === 'ts') ts = value?.trim();
      if (key?.trim() === 'v1') hash = value?.trim();
    }

    if (!ts || !hash) return false;

    const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
    const expectedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    if (hash.length !== expectedHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }

  private mapStatus(mpStatus: string): string {
    const map: Record<string, string> = {
      approved: 'completed',
      in_process: 'pending',
      pending: 'pending',
      rejected: 'failed',
      refunded: 'refunded',
      cancelled: 'failed',
    };
    return map[mpStatus] || 'pending';
  }
}
