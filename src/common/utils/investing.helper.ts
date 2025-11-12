import { Injectable } from '@nestjs/common';
import { IPlatformHelper } from '../interfaces/platform.interface';

/**
 * Helper para construcción de URLs y configuración de Investing.com
 */
@Injectable()
export class InvestingHelper implements IPlatformHelper {
  private readonly baseUrl = 'https://www.investing.com/currencies';

  // Mapeo de símbolos estándar a slugs de Investing.com
  private readonly symbolSlugMap: Record<string, string> = {
    XAUUSD: 'xau-usd',
    EURUSD: 'eur-usd',
    GBPUSD: 'gbp-usd',
    USDJPY: 'usd-jpy',
    AUDUSD: 'aud-usd',
    USDCAD: 'usd-cad',
    NZDUSD: 'nzd-usd',
    USDCHF: 'usd-chf',
    EURGBP: 'eur-gbp',
    EURJPY: 'eur-jpy',
  };

  /**
   * Construye URL de Investing.com con símbolo
   * Ejemplo: https://www.investing.com/currencies/xau-usd-chart
   * Nota: Investing.com no soporta timeframe en URL, debe cambiarse en la interfaz
   */
  buildUrl(symbol: string, timeframe: string): string {
    const slug = this.mapSymbol(symbol);
    return `${this.baseUrl}/${slug}-chart`;
  }

  /**
   * Selector del contenedor principal del gráfico en Investing.com
   */
  getChartSelector(): string {
    return '#chart, .chart-wrapper';
  }

  /**
   * Elementos de UI a remover antes de capturar screenshot
   * Investing.com tiene MÁS publicidad que TradingView
   */
  getElementsToRemove(): string[] {
    return [
      '.adPlaceholder',
      '.banner',
      '.cookiePolicy',
      '.topBar',
      '.sidebar',
      '.footer',
      '[class*="ad"]',
      '[class*="Ad"]',
      '.popup',
    ];
  }

  /**
   * Timeout de espera para Investing.com (más lento: 20 segundos)
   * Investing.com suele cargar más lento debido a publicidad
   */
  getWaitTimeout(): number {
    return 20000; // 20 segundos
  }

  /**
   * Mapea símbolo estándar a slug de Investing.com
   * XAUUSD -> xau-usd
   */
  mapSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    const slug = this.symbolSlugMap[upperSymbol];

    if (!slug) {
      throw new Error(
        `Símbolo ${symbol} no soportado en Investing.com. Símbolos disponibles: ${Object.keys(this.symbolSlugMap).join(', ')}`,
      );
    }

    return slug;
  }

  /**
   * Mapea timeframe a formato Investing.com
   * Nota: Investing.com requiere interacción con la interfaz para cambiar timeframe
   * Esta función retorna el timeframe pero no se usa en la URL
   */
  mapTimeframe(timeframe: string): string {
    const timeframeMap: Record<string, string> = {
      '5': '5',
      '15': '15',
      '30': '30',
      '60': '60',
      '300': '300', // 5 horas
      '1D': '1D',
      'D': '1D',
    };

    return timeframeMap[timeframe] || timeframe;
  }

  /**
   * Retorna nombre de la plataforma
   */
  getPlatformName(): string {
    return 'investing';
  }

  /**
   * Obtiene selectores específicos para cambiar timeframe en Investing.com
   * Estos selectores se usan con page.click() en Puppeteer
   */
  getTimeframeSelectors(): Record<string, string> {
    return {
      '5': '[data-test="timeframe-5M"]',
      '15': '[data-test="timeframe-15M"]',
      '30': '[data-test="timeframe-30M"]',
      '60': '[data-test="timeframe-1H"]',
      '300': '[data-test="timeframe-5H"]',
      '1D': '[data-test="timeframe-1D"]',
    };
  }
}
