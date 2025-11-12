import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { ScreenshotsService } from './screenshots.service';
import { BatchScreenshotDto } from './dto/batch-screenshot.dto';
import { SingleScreenshotDto } from './dto/single-screenshot.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

/**
 * Controller para endpoints de captura de screenshots
 */
@ApiTags('screenshots')
@Controller('screenshots')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class ScreenshotsController {
  constructor(private readonly screenshotsService: ScreenshotsService) {}

  /**
   * POST /screenshots/batch - Captura múltiple de screenshots
   */
  @Post('batch')
  @ApiOperation({
    summary: 'Captura múltiple de screenshots',
    description:
      'Genera screenshots de múltiples símbolos en múltiples timeframes. ' +
      'Soporta TradingView e Investing.com. Procesa en paralelo con límite de concurrencia.',
  })
  @ApiBody({ type: BatchScreenshotDto })
  @ApiResponse({
    status: 200,
    description: 'Screenshots generados exitosamente',
    schema: {
      example: {
        success: true,
        data: {
          totalImages: 3,
          platform: 'tradingview',
          screenshots: [
            {
              symbol: 'XAUUSD',
              timeframe: '4H',
              platform: 'tradingview',
              imageUrl: '/screenshots/XAUUSD_240_1234567890.png',
              metadata: {
                capturedAt: '2025-11-12T10:30:00Z',
                fileSize: '245KB',
                dimensions: '1920x1080',
              },
            },
          ],
          summary: {
            successful: 3,
            failed: 0,
            totalTime: '12.5s',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Request inválido - Validación de DTOs fallida',
  })
  @ApiResponse({
    status: 401,
    description: 'API Key inválida o no proporcionada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async batchCapture(@Body() dto: BatchScreenshotDto) {
    return this.screenshotsService.batchCapture(dto);
  }

  /**
   * POST /screenshots/single - Captura individual de screenshot
   */
  @Post('single')
  @ApiOperation({
    summary: 'Captura individual de screenshot',
    description:
      'Genera un screenshot de un símbolo en un timeframe específico. ' +
      'Soporta TradingView e Investing.com.',
  })
  @ApiBody({ type: SingleScreenshotDto })
  @ApiResponse({
    status: 200,
    description: 'Screenshot generado exitosamente',
    schema: {
      example: {
        success: true,
        data: {
          symbol: 'XAUUSD',
          timeframe: '4H',
          platform: 'tradingview',
          imageUrl: '/screenshots/XAUUSD_240_1234567890.png',
          metadata: {
            capturedAt: '2025-11-12T10:30:00Z',
            fileSize: '245KB',
            dimensions: '1920x1080',
            totalTime: '4.2s',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Request inválido - Validación de DTOs fallida',
  })
  @ApiResponse({
    status: 401,
    description: 'API Key inválida o no proporcionada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async singleCapture(@Body() dto: SingleScreenshotDto) {
    return this.screenshotsService.singleCapture(dto);
  }
}
