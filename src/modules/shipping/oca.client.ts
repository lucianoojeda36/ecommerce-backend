import { XMLParser } from 'fast-xml-parser';
import { config } from '../../core/config';
import { logger } from '../../core/logger';

const BASE_URL = {
  qa: 'https://integraciones.ocadev.com.ar/epak_tracking_test/Oep_TrackEPak.asmx',
  prod: 'https://webservice.oca.com.ar/ePak_tracking/Oep_TrackEPak.asmx',
}[config.oca.env];

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });

interface CotizarParams {
  pesoTotalKg: number;
  volumenTotalM3: number;
  codigoPostalOrigen: string;
  codigoPostalDestino: string;
  cantidadPaquetes: number;
  valorDeclarado: number;
  operativa: string;
}

export class OcaClientError extends Error {}

export class OcaClient {
  async cotizar(params: CotizarParams): Promise<number> {
    if (!config.oca.cuit || !params.operativa) {
      throw new OcaClientError('OCA no está configurado (falta OCA_CUIT o la operativa para este método de envío)');
    }

    const query = new URLSearchParams({
      PesoTotal: params.pesoTotalKg.toFixed(3),
      VolumenTotal: params.volumenTotalM3.toFixed(6),
      CodigoPostalOrigen: params.codigoPostalOrigen,
      CodigoPostalDestino: params.codigoPostalDestino,
      CantidadPaquetes: String(params.cantidadPaquetes),
      Cuit: config.oca.cuit,
      Operativa: params.operativa,
      ValorDeclarado: params.valorDeclarado.toFixed(2),
    });

    const url = `${BASE_URL}/Tarifar_Envio_Corporativo?${query.toString()}`;

    let xml: string;
    try {
      const response = await fetch(url);
      xml = await response.text();
      if (!response.ok) {
        throw new OcaClientError(`OCA respondió ${response.status}: ${xml}`);
      }
    } catch (error) {
      logger.error('OCA cotizador request failed', { error, params });
      throw error instanceof OcaClientError ? error : new OcaClientError('No se pudo contactar a OCA');
    }

    logger.info('OCA cotizador raw response', { xml });

    // Estructura confirmada contra el ambiente QA (respuesta real, caso de éxito):
    // DataSet > diffgram (xmlns diffgr) > NewDataSet > Table (el diffgr:id="Table1" es un
    // atributo, no el nombre del elemento) > { Total, Precio, Ambito, PlazoEntrega, ... }
    const parsed = parser.parse(xml);
    const table = parsed?.DataSet?.diffgram?.NewDataSet?.Table;

    if (!table) {
      throw new OcaClientError(`Respuesta de OCA con formato inesperado: ${xml}`);
    }
    if (table.Error) {
      throw new OcaClientError(`OCA rechazó la cotización: ${table.Error}`);
    }

    const cost = Number(table.Total);

    if (!Number.isFinite(cost) || cost <= 0) {
      throw new OcaClientError(`No se pudo interpretar la tarifa en la respuesta de OCA: ${xml}`);
    }

    return cost;
  }
}
