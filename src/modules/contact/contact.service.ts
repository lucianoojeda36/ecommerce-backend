import { EmailService } from '../email/email.service';
import { logger } from '../../core/logger';

const emailService = new EmailService();

interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export class ContactService {
  async sendMessage(data: ContactMessage) {
    logger.info('Enviando mensaje de contacto', { from: data.email, subject: data.subject });
    await emailService.sendContactEmail(data);
    return { success: true, message: 'Mensaje enviado correctamente' };
  }
}
