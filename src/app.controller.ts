import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * Controller para health checks y endpoints generales
 */
@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Bienvenida a la API',
    description: 'Endpoint raíz que retorna mensaje de bienvenida',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje de bienvenida',
    schema: {
      example: 'Screenshot Service API - Documentación en /api/docs',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check del servicio',
    description:
      'Verifica que el servicio esté funcionando correctamente. ' +
      'Útil para monitoreo con UptimeRobot o similar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio funcionando correctamente',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-11-12T10:30:00.000Z',
        uptime: 12345.67,
        service: 'Screenshot Service',
        version: '1.0.0',
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'Screenshot Service',
      version: '1.0.0',
    };
  }
}
