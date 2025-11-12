import { Injectable } from '@nestjs/common';
import { IPlatformHelper } from '../interfaces/platform.interface';
import { TradingViewHelper } from './tradingview.helper';
import { InvestingHelper } from './investing.helper';

/**
 * Factory para selección de plataforma de gráficos
 * Implementa patrón Factory para crear helpers de plataformas
 * Esto permite agregar nuevas plataformas sin modificar código existente
 */
@Injectable()
export class PlatformFactory {
  constructor(
    private readonly tradingViewHelper: TradingViewHelper,
    private readonly investingHelper: InvestingHelper,
  ) {}

  /**
   * Crea y retorna el helper correcto según la plataforma solicitada
   * @param platform - Nombre de la plataforma ('tradingview' o 'investing')
   * @returns Helper de la plataforma
   * @throws Error si la plataforma no es soportada
   */
  create(platform: string): IPlatformHelper {
    const normalizedPlatform = platform.toLowerCase();

    switch (normalizedPlatform) {
      case 'tradingview':
        return this.tradingViewHelper;

      case 'investing':
        return this.investingHelper;

      default:
        throw new Error(
          `Plataforma '${platform}' no soportada. Plataformas disponibles: tradingview, investing`,
        );
    }
  }

  /**
   * Retorna lista de plataformas soportadas
   */
  getSupportedPlatforms(): string[] {
    return ['tradingview', 'investing'];
  }

  /**
   * Verifica si una plataforma es soportada
   */
  isPlatformSupported(platform: string): boolean {
    return this.getSupportedPlatforms().includes(platform.toLowerCase());
  }
}
