import { Injectable } from '@nestjs/common';
import { IPlatformHelper } from '../interfaces/platform.interface';

/**
 * Helper para construcción de URLs y configuración de TradingView
 */
@Injectable()
export class TradingViewHelper implements IPlatformHelper {
  private readonly baseUrl = 'https://www.tradingview.com/chart/';
  private readonly exchange = 'OANDA'; // Exchange por defecto para forex/commodities

  /**
   * Construye URL de TradingView con símbolo y timeframe
   * Ejemplo: https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD&interval=240
   */
  buildUrl(symbol: string, timeframe: string): string {
    const mappedSymbol = this.mapSymbol(symbol);
    const mappedTimeframe = this.mapTimeframe(timeframe);
    return `${this.baseUrl}?symbol=${this.exchange}:${mappedSymbol}&interval=${mappedTimeframe}`;
  }

  /**
   * Selector del contenedor principal del gráfico en TradingView
   */
  getChartSelector(): string {
    return '.chart-container';
  }

  /**
   * Elementos de UI a remover antes de capturar screenshot
   * Remueve: toolbar superior, sidebar izquierda, popups, toasts
   */
  getElementsToRemove(): string[] {
    return [
      '.header-toolbar',
      '.left-toolbar',
      '.toast-container',
      '.banner',
      '.popup',
    ];
  }

  /**
   * Timeout de espera para TradingView (rápido: 15 segundos)
   */
  getWaitTimeout(): number {
    return 15000; // 15 segundos
  }

  /**
   * Mapea símbolo a formato TradingView (sin cambios, mayúsculas)
   */
  mapSymbol(symbol: string): string {
    return symbol.toUpperCase();
  }

  /**
   * Mapea timeframe a formato TradingView
   * Acepta: 1, 5, 15, 60, 240, 1D
   */
  mapTimeframe(timeframe: string): string {
    const timeframeMap: Record<string, string> = {
      '1': '1',
      '5': '5',
      '15': '15',
      '30': '30',
      '60': '60',
      '240': '240',
      '1D': '1D',
      'D': '1D',
    };

    return timeframeMap[timeframe] || timeframe;
  }

  /**
   * Retorna nombre de la plataforma
   */
  getPlatformName(): string {
    return 'tradingview';
  }
}
