import nodemailer from 'nodemailer';
import { config } from '../../core/config';
import { logger } from '../../core/logger';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

interface ContactEmailData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface OrderEmailData {
  orderId: string;
  total: number;
  items: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
  shippingAddress: {
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
}

export class EmailService {
  private from = config.smtp.from || config.smtp.user;

  async sendContactEmail(data: ContactEmailData) {
    if (!config.smtp.user) {
      logger.warn('SMTP no configurado, email de contacto no enviado');
      return;
    }

    const to = config.smtp.contactTo || config.smtp.user;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0 0 16px 0;">Nuevo mensaje de contacto</h2>
          <p style="color: #666; margin: 0;">Recibiste un nuevo mensaje desde el formulario de contacto de tu tienda.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555; width: 120px;">Nombre</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Email</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;"><a href="mailto:${data.email}">${data.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Asunto</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${data.subject}</td>
          </tr>
        </table>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px;">
          <h3 style="color: #333; margin: 0 0 10px 0;">Mensaje:</h3>
          <p style="color: #333; line-height: 1.6; margin: 0; white-space: pre-wrap;">${data.message}</p>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">
          Este mensaje fue enviado desde el formulario de contacto de tu tienda.
        </p>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: this.from,
      to,
      replyTo: data.email,
      subject: `[Contacto] ${data.subject}`,
      html,
    });

    logger.info('Email de contacto enviado', { to, from: data.email, subject: data.subject });
  }

  async sendOrderConfirmation(data: OrderEmailData, userEmail: string, userName: string) {
    if (!config.smtp.user) {
      logger.warn('SMTP no configurado, email de confirmación no enviado');
      return;
    }

    const itemsHtml = data.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${item.product_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: right;">$${Number(item.unit_price).toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: right; font-weight: bold;">$${Number(item.subtotal).toLocaleString()}</td>
        </tr>`
      )
      .join('');

    const addressParts = [
      data.shippingAddress.street,
      data.shippingAddress.number,
      data.shippingAddress.city,
      data.shippingAddress.state,
      data.shippingAddress.zip_code,
    ]
      .filter(Boolean)
      .join(', ');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #d4edda; border-radius: 8px; padding: 24px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #155724; margin: 0 0 8px 0;">¡Compra confirmada!</h2>
          <p style="color: #155724; margin: 0;">Tu orden <strong>#${data.orderId.slice(0, 8).toUpperCase()}</strong> fue recibida correctamente.</p>
        </div>
        <p style="color: #333;">Hola <strong>${userName}</strong>,</p>
        <p style="color: #666;">Gracias por tu compra. Aquí tenés el resumen de tu pedido:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left; color: #555;">Producto</th>
              <th style="padding: 10px; text-align: center; color: #555;">Cant.</th>
              <th style="padding: 10px; text-align: right; color: #555;">Precio</th>
              <th style="padding: 10px; text-align: right; color: #555;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 10px; text-align: right; font-weight: bold; color: #333; border-top: 2px solid #333;">Total</td>
              <td style="padding: 12px 10px; text-align: right; font-weight: bold; color: #333; border-top: 2px solid #333; font-size: 18px;">$${Number(data.total).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        ${addressParts ? `
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="color: #333; margin: 0 0 8px 0; font-size: 14px;">Dirección de envío:</h3>
          <p style="color: #666; margin: 0;">${addressParts}</p>
        </div>
        ` : ''}
        <p style="color: #666;">Te notificaremos cuando tu pedido sea despachado.</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">
          Si tenés alguna consulta, respondé a este email o contactanos desde nuestra tienda.
        </p>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: this.from,
      to: userEmail,
      subject: `[${config.smtp.from || 'Tu Tienda'}] Confirmación de compra #${data.orderId.slice(0, 8).toUpperCase()}`,
      html,
    });

    logger.info('Email de confirmación enviado', { to: userEmail, orderId: data.orderId });
  }
}
