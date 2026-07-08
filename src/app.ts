import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './core/config';
import { errorHandler } from './core/middleware/errorHandler';
import { logger } from './core/logger';
import { initSocket } from './core/socket';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import productsRoutes from './modules/products/products.routes';
import cartRoutes from './modules/cart/cart.routes';
import ordersRoutes from './modules/orders/orders.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import adminRoutes from './modules/admin/admin.routes';
import addressesRoutes from './modules/addresses/addresses.routes';
import contactRoutes from './modules/contact/contact.routes';
import shippingRoutes from './modules/shipping/shipping.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/shipping', shippingRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

server.listen(config.port, () => {
  logger.info(`🚀 Servidor iniciado en puerto ${config.port}`);
  logger.info(`📦 Entorno: ${config.nodeEnv}`);
});

export default server;
