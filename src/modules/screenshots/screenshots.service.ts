import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PlatformFactory } from '../../common/utils/platform.factory';
import { BatchScreenshotDto } from './dto/batch-screenshot.dto';
import { SingleScreenshotDto } from './dto/single-screenshot.dto';

/**
 * Servicio para captura de screenshots de gráficos financieros
 * Soporta TradingView e Investing.com con Puppeteer
 * Almacenamiento: local o S3
 */
@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);
  private readonly maxRetries = 3;
  private readonly storagePath: string;
  private readonly storageType: string;

  constructor(
    private readonly platformFactory: PlatformFactory,
    private readonly configService: ConfigService,
  ) {
    this.storagePath =
      this.configService.get<string>('storage.path') || './storage/screenshots';
    this.storageType =
      this.configService.get<string>('storage.type') || 'local';

    // Crear carpeta de almacenamiento local si no existe y se usa storage local
    if (this.storageType === 'local' && !existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }

    this.logger.log(`📁 Storage type: ${this.storageType}`);
  }

  /**
   * Captura múltiple de screenshots (endpoint /batch)
   */
  async batchCapture(dto: BatchScreenshotDto) {
    const startTime = Date.now();
    this.logger.log(
      `Iniciando batch capture: ${dto.symbols.length} símbolos × ${dto.timeframes.length} timeframes = ${dto.symbols.length * dto.timeframes.length} screenshots`,
    );

    const screenshots: any[] = [];
    const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_SCREENSHOTS || '3');

    // Generar todas las combinaciones símbolo/timeframe
    const tasks: Array<{ symbol: string; timeframe: string }> = [];
    for (const symbol of dto.symbols) {
      for (const timeframe of dto.timeframes) {
        tasks.push({ symbol, timeframe });
      }
    }

    // Procesar en lotes con control de concurrencia
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < tasks.length; i += maxConcurrent) {
      const batch = tasks.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(({ symbol, timeframe }) =>
        this.captureScreenshot(symbol, timeframe, dto.platform, dto)
          .then((result) => {
            successful++;
            return result;
          })
          .catch((error) => {
            failed++;
            this.logger.error(
              `Error capturando ${symbol} ${timeframe}: ${error.message}`,
            );
            return {
              symbol,
              timeframe,
              error: error.message,
              success: false,
            };
          }),
      );

      const batchResults = await Promise.all(batchPromises);
      screenshots.push(...batchResults);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    this.logger.log(
      `Batch capture completado: ${successful} exitosos, ${failed} fallidos en ${totalTime}s`,
    );

    return {
      success: true,
      data: {
        totalImages: tasks.length,
        platform: dto.platform || 'tradingview',
        screenshots: screenshots.filter((s) => s.success !== false),
        summary: {
          successful,
          failed,
          totalTime: `${totalTime}s`,
        },
      },
    };
  }

  /**
   * Captura individual de screenshot (endpoint /single)
   */
  async singleCapture(dto: SingleScreenshotDto) {
    const startTime = Date.now();
    this.logger.log(
      `Capturando screenshot: ${dto.symbol} ${dto.timeframe} en ${dto.platform}`,
    );

    const result = await this.captureScreenshot(
      dto.symbol,
      dto.timeframe,
      dto.platform,
      dto,
    );

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      success: true,
      data: {
        ...result,
        metadata: {
          ...result.metadata,
          totalTime: `${totalTime}s`,
        },
      },
    };
  }

  /**
   * Lógica principal de captura de screenshot con Puppeteer
   */
  private async captureScreenshot(
    symbol: string,
    timeframe: string,
    platform: string = 'tradingview',
    options: any = {},
  ): Promise<any> {
    let browser: puppeteer.Browser | null = null;
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        // Obtener helper de plataforma
        const platformHelper = this.platformFactory.create(platform);

        // Construir URL
        const url = platformHelper.buildUrl(symbol, timeframe);
        this.logger.debug(`URL generada: ${url}`);

        // Lanzar navegador
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });

        const page = await browser.newPage();

        // Configurar viewport - 2560x1440 (QHD/2K) para mejor calidad de análisis con Claude AI
        await page.setViewport({
          width: options.width || 2560,
          height: options.height || 1440,
        });

        // Navegar a la URL
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: platformHelper.getWaitTimeout(),
        });

        // Esperar por el selector del gráfico
        await page.waitForSelector(platformHelper.getChartSelector(), {
          timeout: 10000,
        });

        // Buffer adicional para renderizado completo (específico por plataforma)
        const renderDelay = platformHelper.getRenderDelay();
        await new Promise((resolve) => setTimeout(resolve, renderDelay));

        // Limpiar elementos de UI
        const elementsToRemove = platformHelper.getElementsToRemove();
        await page.evaluate((selectors) => {
          selectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => el.remove());
          });
        }, elementsToRemove);

        // Capturar screenshot
        const screenshotData = await page.screenshot({
          type: (options.format || 'png') as 'png' | 'jpeg',
          fullPage: false,
        });

        // Convertir a Buffer para escritura de archivos
        const screenshot = Buffer.from(screenshotData);

        await browser.close();

        // Preparar datos básicos
        const timestamp = Date.now();
        const filename = `${symbol}_${timeframe}_${timestamp}.${options.format || 'png'}`;

        // Guardar archivo en almacenamiento local
        let imageUrl: string | null = null;
        if (options.saveToStorage !== false) {
          // Por defecto saveToStorage es true
          const filepath = join(this.storagePath, filename);
          writeFileSync(filepath, screenshot);
          imageUrl = `/screenshots/${filename}`;
          this.logger.debug(`Screenshot guardado localmente: ${filepath}`);
        } else {
          this.logger.debug(`Screenshot NO guardado (saveToStorage=false)`);
        }

        // Preparar response
        const result: any = {
          symbol,
          timeframe: this.formatTimeframe(timeframe),
          platform: platformHelper.getPlatformName(),
          metadata: {
            capturedAt: new Date().toISOString(),
            fileSize: `${(screenshot.length / 1024).toFixed(2)}KB`,
            dimensions: `${options.width || 1920}x${options.height || 1080}`,
          },
        };

        // Incluir imageUrl solo si se guardó
        if (imageUrl) {
          result.imageUrl = imageUrl;
        }

        // Incluir base64 si se solicita
        if (options.includeBase64) {
          result.base64 = `data:image/${options.format || 'png'};base64,${Buffer.from(screenshot).toString('base64')}`;
        }

        this.logger.log(`Screenshot capturado exitosamente: ${filename}`);
        return result;
      } catch (error) {
        retries++;
        this.logger.warn(
          `Intento ${retries}/${this.maxRetries} fallido para ${symbol} ${timeframe}: ${error.message}`,
        );

        if (browser) {
          await browser.close().catch(() => {});
        }

        if (retries >= this.maxRetries) {
          throw new BadRequestException(
            `Error capturando screenshot de ${symbol} ${timeframe} después de ${this.maxRetries} intentos: ${error.message}`,
          );
        }

        // Esperar antes de reintentar (backoff exponencial)
        await this.sleep(1000 * Math.pow(2, retries - 1));
      }
    }
  }

  /**
   * Formatea timeframe a formato legible
   */
  private formatTimeframe(timeframe: string): string {
    const map: Record<string, string> = {
      '1': '1M',
      '5': '5M',
      '15': '15M',
      '30': '30M',
      '60': '1H',
      '240': '4H',
      '1D': '1D',
      D: '1D',
    };

    return map[timeframe] || timeframe;
  }

  /**
   * Helper para sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
