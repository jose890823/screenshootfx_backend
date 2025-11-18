import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

/**
 * Controller para health checks del sistema
 * No requiere autenticación (público para monitoreo)
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /health - Verifica estado de salud del sistema
   */
  @Get()
  @ApiOperation({
    summary: 'Health check del sistema',
    description:
      'Verifica el estado de salud de la aplicación y todas sus dependencias: ' +
      'API (NestJS), Puppeteer (Chromium), Storage (filesystem), Database (PostgreSQL). ' +
      'Este endpoint NO requiere autenticación y está diseñado para herramientas de monitoreo como UptimeRobot.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sistema saludable - Todos los componentes funcionando correctamente',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '3h 24m 15s',
        checks: {
          api: {
            status: 'up',
            message: 'NestJS app is running',
            metadata: {
              nodeVersion: 'v18.17.0',
              platform: 'linux',
              environment: 'production',
            },
          },
          puppeteer: {
            status: 'up',
            message: 'Chromium can be launched successfully',
            metadata: {
              version: 'Chrome/120.0.6099.109',
              launchTime: '1234ms',
            },
          },
          storage: {
            status: 'up',
            message: 'Storage directory is accessible and writable',
            metadata: {
              path: './storage/screenshots',
            },
          },
          database: {
            status: 'up',
            message: 'PostgreSQL connection active',
            metadata: {
              responseTime: '12ms',
              database: 'screenshoot_fx',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Sistema degradado o con errores - Uno o más componentes no funcionan',
    schema: {
      example: {
        status: 'error',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '3h 24m 15s',
        checks: {
          api: {
            status: 'up',
            message: 'NestJS app is running',
          },
          puppeteer: {
            status: 'down',
            message: 'Failed to launch Chromium',
            error: 'Could not find Chrome executable',
          },
          storage: {
            status: 'down',
            message: 'Storage directory is not writable',
            error: 'EACCES: permission denied',
          },
          database: {
            status: 'up',
            message: 'PostgreSQL connection active',
          },
        },
      },
    },
  })
  async checkHealth() {
    const health = await this.healthService.checkHealth();

    // Si hay algún componente down, retornar 503 Service Unavailable
    if (health.status === 'error') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        ...health,
      };
    }

    return health;
  }
}
