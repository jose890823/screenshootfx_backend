import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as puppeteer from 'puppeteer';
import { existsSync, accessSync, constants } from 'fs';

/**
 * Interfaz para el resultado de cada verificación de salud
 */
export interface HealthCheckResult {
  status: 'up' | 'down';
  message: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Interfaz para la respuesta completa del health check
 */
export interface HealthResponse {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: string;
  checks: {
    api: HealthCheckResult;
    puppeteer: HealthCheckResult;
    storage: HealthCheckResult;
    database: HealthCheckResult;
    environment: HealthCheckResult;
  };
}

/**
 * Servicio para verificar el estado de salud del sistema
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime: number;
  private readonly storagePath: string;

  constructor(
    @Optional()
    @InjectDataSource()
    private readonly dataSource: DataSource | null = null,
  ) {
    this.startTime = Date.now();
    this.storagePath = process.env.STORAGE_PATH || './storage/screenshots';
  }

  /**
   * Ejecuta todas las verificaciones de salud
   */
  async checkHealth(): Promise<HealthResponse> {
    this.logger.debug('Ejecutando health check completo...');

    const checks = {
      api: await this.checkApi(),
      puppeteer: await this.checkPuppeteer(),
      storage: await this.checkStorage(),
      database: await this.checkDatabase(),
      environment: await this.checkEnvironment(),
    };

    // Determinar estado general
    const hasDown = Object.values(checks).some((check) => check.status === 'down');
    const allUp = Object.values(checks).every((check) => check.status === 'up');

    const status = hasDown ? 'error' : allUp ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      checks,
    };
  }

  /**
   * Verifica que la aplicación NestJS está funcionando
   */
  private async checkApi(): Promise<HealthCheckResult> {
    try {
      return {
        status: 'up',
        message: 'NestJS app is running',
        metadata: {
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV || 'development',
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'API check failed',
        error: error.message,
      };
    }
  }

  /**
   * Verifica que Puppeteer puede lanzar Chromium
   */
  private async checkPuppeteer(): Promise<HealthCheckResult> {
    let browser: puppeteer.Browser | null = null;

    try {
      const startTime = Date.now();

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const version = await browser.version();
      const launchTime = Date.now() - startTime;

      await browser.close();

      return {
        status: 'up',
        message: 'Chromium can be launched successfully',
        metadata: {
          version,
          launchTime: `${launchTime}ms`,
        },
      };
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {});
      }

      return {
        status: 'down',
        message: 'Failed to launch Chromium',
        error: error.message,
      };
    }
  }

  /**
   * Verifica que el directorio de almacenamiento existe y es escribible
   */
  private async checkStorage(): Promise<HealthCheckResult> {
    try {
      // Verificar si el directorio existe
      if (!existsSync(this.storagePath)) {
        return {
          status: 'down',
          message: 'Storage directory does not exist',
          error: `Path not found: ${this.storagePath}`,
        };
      }

      // Verificar permisos de escritura
      accessSync(this.storagePath, constants.W_OK | constants.R_OK);

      return {
        status: 'up',
        message: 'Storage directory is accessible and writable',
        metadata: {
          path: this.storagePath,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Storage directory is not writable',
        error: error.message,
      };
    }
  }

  /**
   * Verifica la conexión a PostgreSQL
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    try {
      if (!this.dataSource) {
        return {
          status: 'down',
          message: 'Database connection failed',
          error: 'DataSource not available',
        };
      }

      const startTime = Date.now();

      // Ejecutar query simple para verificar conexión
      await this.dataSource.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        message: 'PostgreSQL connection active',
        metadata: {
          responseTime: `${responseTime}ms`,
          database: this.dataSource.options.database,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Database connection failed',
        error: error.message,
      };
    }
  }

  /**
   * Verifica que las variables de entorno críticas están configuradas
   */
  private async checkEnvironment(): Promise<HealthCheckResult> {
    try {
      const criticalVars = [
        'MASTER_KEY',
        'DB_HOST',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DB_DATABASE',
      ];

      const missingVars = criticalVars.filter((varName) => !process.env[varName]);

      const configuredVars = {
        port: process.env.PORT ? '✅' : '⚠️ (default: 3000)',
        nodeEnv: process.env.NODE_ENV ? '✅' : '⚠️ (default: development)',
        masterKey: process.env.MASTER_KEY ? '✅' : '❌',
        dbHost: process.env.DB_HOST ? '✅' : '❌',
        dbPort: process.env.DB_PORT ? '✅' : '⚠️ (default: 5432)',
        dbUsername: process.env.DB_USERNAME ? '✅' : '❌',
        dbPassword: process.env.DB_PASSWORD ? '✅' : '❌',
        dbDatabase: process.env.DB_DATABASE ? '✅' : '❌',
        maxConcurrentScreenshots: process.env.MAX_CONCURRENT_SCREENSHOTS
          ? '✅'
          : '⚠️ (default: 3)',
        screenshotTimeout: process.env.SCREENSHOT_TIMEOUT
          ? '✅'
          : '⚠️ (default: 30000)',
        maxBatchSize: process.env.MAX_BATCH_SIZE ? '✅' : '⚠️ (default: 20)',
        storageType: process.env.STORAGE_TYPE ? '✅' : '⚠️ (default: local)',
        storagePath: process.env.STORAGE_PATH
          ? '✅'
          : '⚠️ (default: ./storage/screenshots)',
      };

      if (missingVars.length > 0) {
        return {
          status: 'down',
          message: `Missing ${missingVars.length} critical environment variable(s)`,
          error: `Variables faltantes: ${missingVars.join(', ')}`,
          metadata: {
            missingVars,
            configuredVars,
          },
        };
      }

      return {
        status: 'up',
        message: 'All critical environment variables are configured',
        metadata: {
          configuredVars,
          totalConfigured: Object.keys(configuredVars).filter(
            (key) => configuredVars[key] === '✅',
          ).length,
          totalWithDefaults: Object.keys(configuredVars).filter((key) =>
            configuredVars[key].includes('default'),
          ).length,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Environment check failed',
        error: error.message,
      };
    }
  }

  /**
   * Calcula el uptime del servicio
   */
  private getUptime(): string {
    const uptimeMs = Date.now() - this.startTime;
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
