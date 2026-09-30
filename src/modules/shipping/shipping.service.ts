import { query } from '../../core/database/pool';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { OcaClient } from './oca.client';

export type DeliveryMethod = 'domicilio' | 'sucursal';

interface ShippingRate {
  province: string;
  cost: number;
}

interface ShippingConfig {
  rates: ShippingRate[];
  default_rate: number;
  free_shipping_threshold: number;
}

interface PackageDimensions {
  largo: number;
  ancho: number;
  alto: number;
}

interface StoreShippingSettings {
  shipping_config: ShippingConfig;
  shipping_origin_postal_code: string | null;
  shipping_package_dimensions: PackageDimensions;
  shipping_default_weight_kg: number;
}

interface CartItemForShipping {
  quantity: number;
  weight_kg: number | string | null;
}

const ocaClient = new OcaClient();

export class ShippingService {
  async getShippingConfig(): Promise<ShippingConfig> {
    const settings = await this.getStoreShippingSettings();
    return settings.shipping_config;
  }

  private async getStoreShippingSettings(): Promise<StoreShippingSettings> {
    const result = await query(
      `SELECT shipping_config, shipping_origin_postal_code, shipping_package_dimensions, shipping_default_weight_kg
       FROM store_settings LIMIT 1`
    );
    if (result.rows.length === 0) {
      return {
        shipping_config: { rates: [], default_rate: 0, free_shipping_threshold: 0 },
        shipping_origin_postal_code: null,
        shipping_package_dimensions: { largo: 30, ancho: 20, alto: 15 },
        shipping_default_weight_kg: 0.5,
      };
    }
    const row = result.rows[0];
    return {
      shipping_config: row.shipping_config || { rates: [], default_rate: 0, free_shipping_threshold: 0 },
      shipping_origin_postal_code: row.shipping_origin_postal_code,
      shipping_package_dimensions: row.shipping_package_dimensions || { largo: 30, ancho: 20, alto: 15 },
      shipping_default_weight_kg: Number(row.shipping_default_weight_kg ?? 0.5),
    };
  }

  /** Tarifa plana por provincia — usada como fallback si OCA no responde. */
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
    logger.info('Shipping cost calculated (flat rate)', { province, cost, usedDefault: !rate });
    return { cost, free_shipping: false };
  }

  async calculateShippingOCA(
    destinationPostalCode: string,
    cartTotal: number,
    items: CartItemForShipping[],
    deliveryMethod: DeliveryMethod = 'domicilio'
  ): Promise<{ cost: number; free_shipping: boolean }> {
    const settings = await this.getStoreShippingSettings();

    if (settings.shipping_config.free_shipping_threshold > 0 &&
        cartTotal >= settings.shipping_config.free_shipping_threshold) {
      logger.info('Free shipping applied', { destinationPostalCode, cartTotal });
      return { cost: 0, free_shipping: true };
    }

    if (!settings.shipping_origin_postal_code) {
      logger.warn('OCA shipping skipped: falta shipping_origin_postal_code, usando tarifa plana');
      return this.calculateShipping('', cartTotal);
    }

    const operativa = deliveryMethod === 'sucursal'
      ? config.oca.operativaSucursal
      : config.oca.operativaDomicilio;

    const totalWeightKg = items.reduce((sum, item) => {
      const weight = Number(item.weight_kg) || settings.shipping_default_weight_kg;
      return sum + weight * item.quantity;
    }, 0) || settings.shipping_default_weight_kg;

    const { largo, ancho, alto } = settings.shipping_package_dimensions;
    const volumenM3 = (largo / 100) * (ancho / 100) * (alto / 100);

    try {
      const cost = await ocaClient.cotizar({
        pesoTotalKg: totalWeightKg,
        volumenTotalM3: volumenM3,
        codigoPostalOrigen: settings.shipping_origin_postal_code,
        codigoPostalDestino: destinationPostalCode,
        cantidadPaquetes: 1,
        valorDeclarado: cartTotal,
        operativa,
      });
      logger.info('Shipping cost calculated (OCA)', { destinationPostalCode, deliveryMethod, totalWeightKg, cost });
      return { cost, free_shipping: false };
    } catch (error) {
      logger.error('OCA quote failed, falling back to flat rate', {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        destinationPostalCode,
        deliveryMethod,
      });
      return this.calculateShipping('', cartTotal);
    }
  }
}
