/**
 * Interface base para helpers de plataformas de gráficos
 * Permite agregar nuevas plataformas sin modificar código existente (Open/Closed Principle)
 */
export interface IPlatformHelper {
  /**
   * Construye la URL completa para acceder al gráfico
   * @param symbol - Símbolo del activo (ej: XAUUSD, EURUSD)
   * @param timeframe - Timeframe en minutos (ej: 240 para 4H)
   * @returns URL completa del gráfico
   */
  buildUrl(symbol: string, timeframe: string): string;

  /**
   * Retorna el selector CSS para esperar el gráfico cargado
   * @returns Selector CSS del contenedor del gráfico
   */
  getChartSelector(): string;

  /**
   * Retorna array de selectores CSS de elementos a remover de la UI
   * @returns Array de selectores CSS
   */
  getElementsToRemove(): string[];

  /**
   * Retorna el timeout en milisegundos para esperar carga del gráfico
   * @returns Timeout en ms
   */
  getWaitTimeout(): number;

  /**
   * Mapea el símbolo al formato específico de la plataforma
   * @param symbol - Símbolo estándar (ej: XAUUSD)
   * @returns Símbolo en formato de la plataforma
   */
  mapSymbol(symbol: string): string;

  /**
   * Mapea el timeframe al formato específico de la plataforma
   * @param timeframe - Timeframe en minutos (ej: 240)
   * @returns Timeframe en formato de la plataforma
   */
  mapTimeframe(timeframe: string): string;

  /**
   * Retorna el nombre de la plataforma
   * @returns Nombre de la plataforma
   */
  getPlatformName(): string;

  /**
   * Retorna el delay en milisegundos después de esperar el selector
   * para garantizar que el gráfico termine de renderizarse
   * @returns Delay en ms
   */
  getRenderDelay(): number;
}
