import { query } from '../../core/database/pool';
import { logger } from '../../core/logger';

interface ShippingRate {
  province: string;
  cost: number;
}

interface ShippingConfig {
  rates: ShippingRate[];
  default_rate: number;
  free_shipping_threshold: number;
}

export class ShippingService {
  async getShippingConfig(): Promise<ShippingConfig> {
    const result = await query('SELECT shipping_config FROM store_settings LIMIT 1');
    if (result.rows.length === 0) {
      return { rates: [], default_rate: 0, free_shipping_threshold: 0 };
    }
    return result.rows[0].shipping_config || { rates: [], default_rate: 0, free_shipping_threshold: 0 };
  }

  async calculateShipping(province: string, cartTotal: number): Promise<{ cost: number; free_shipping: boolean }> {
    const config = await this.getShippingConfig();

    if (config.free_shipping_threshold > 0 && cartTotal >= config.free_shipping_threshold) {
      logger.info('Free shipping applied', { province, cartTotal, threshold: config.free_shipping_threshold });
      return { cost: 0, free_shipping: true };
    }

    const rate = config.rates.find(
      r => r.province.toLowerCase() === province.toLowerCase()
    );

    const cost = rate ? rate.cost : config.default_rate;
    logger.info('Shipping cost calculated', { province, cost, usedDefault: !rate });
    return { cost, free_shipping: false };
  }
}
