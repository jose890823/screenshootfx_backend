import { Test, TestingModule } from '@nestjs/testing';
import { ScreenshotsController } from './screenshots.controller';
import { ScreenshotsService } from './screenshots.service';
import { BatchScreenshotDto } from './dto/batch-screenshot.dto';
import { SingleScreenshotDto } from './dto/single-screenshot.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

describe('ScreenshotsController', () => {
  let controller: ScreenshotsController;
  let service: ScreenshotsService;

  const mockScreenshotsService = {
    batchCapture: jest.fn(),
    singleCapture: jest.fn(),
  };

  const mockApiKeyGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreenshotsController],
      providers: [
        {
          provide: ScreenshotsService,
          useValue: mockScreenshotsService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue(mockApiKeyGuard)
      .compile();

    controller = module.get<ScreenshotsController>(ScreenshotsController);
    service = module.get<ScreenshotsService>(ScreenshotsService);

    jest.clearAllMocks();
  });

  describe('POST /screenshots/batch', () => {
    it('debe estar definido', () => {
      expect(controller).toBeDefined();
      expect(controller.batchCapture).toBeDefined();
    });

    it('debe retornar screenshots exitosamente con TradingView', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240', '60'],
        platform: 'tradingview',
        includeBase64: false,
      };

      const expectedResult = {
        success: true,
        data: {
          totalImages: 2,
          platform: 'tradingview',
          screenshots: [
            {
              symbol: 'XAUUSD',
              timeframe: '4H',
              platform: 'tradingview',
              imageUrl: '/screenshots/XAUUSD_240_1234567890.png',
              metadata: {
                capturedAt: '2025-11-18T00:00:00Z',
                fileSize: '245KB',
                dimensions: '1920x1080',
              },
            },
            {
              symbol: 'XAUUSD',
              timeframe: '1H',
              platform: 'tradingview',
              imageUrl: '/screenshots/XAUUSD_60_1234567891.png',
              metadata: {
                capturedAt: '2025-11-18T00:00:00Z',
                fileSize: '243KB',
                dimensions: '1920x1080',
              },
            },
          ],
          summary: {
            successful: 2,
            failed: 0,
            totalTime: '8.5s',
          },
        },
      };

      mockScreenshotsService.batchCapture.mockResolvedValue(expectedResult);

      const result = await controller.batchCapture(dto);

      expect(result).toEqual(expectedResult);
      expect(mockScreenshotsService.batchCapture).toHaveBeenCalledWith(dto);
      expect(mockScreenshotsService.batchCapture).toHaveBeenCalledTimes(1);
    });

    it('debe funcionar con Investing.com', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240'],
        platform: 'investing',
        includeBase64: false,
      };

      const expectedResult = {
        success: true,
        data: {
          totalImages: 1,
          platform: 'investing',
          screenshots: [
            {
              symbol: 'XAUUSD',
              timeframe: '4H',
              platform: 'investing',
              imageUrl: '/screenshots/XAUUSD_240_1234567890.png',
              metadata: {
                capturedAt: '2025-11-18T00:00:00Z',
                fileSize: '240KB',
                dimensions: '1920x1080',
              },
            },
          ],
          summary: {
            successful: 1,
            failed: 0,
            totalTime: '5.2s',
          },
        },
      };

      mockScreenshotsService.batchCapture.mockResolvedValue(expectedResult);

      const result = await controller.batchCapture(dto);

      expect(result.data.platform).toBe('investing');
      expect(result.data.screenshots[0].platform).toBe('investing');
    });

    it('debe soportar múltiples símbolos y timeframes', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD', 'EURUSD'],
        timeframes: ['240', '60', '5'],
        platform: 'tradingview',
        includeBase64: false,
      };

      const expectedResult = {
        success: true,
        data: {
          totalImages: 6, // 2 symbols × 3 timeframes
          platform: 'tradingview',
          screenshots: Array(6).fill({
            symbol: 'XAUUSD',
            timeframe: '4H',
            platform: 'tradingview',
            imageUrl: '/screenshots/test.png',
          }),
          summary: {
            successful: 6,
            failed: 0,
            totalTime: '15.0s',
          },
        },
      };

      mockScreenshotsService.batchCapture.mockResolvedValue(expectedResult);

      const result = await controller.batchCapture(dto);

      expect(result.data.totalImages).toBe(6);
      expect(result.data.summary.successful).toBe(6);
    });

    it('debe incluir base64 cuando se solicita', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240'],
        platform: 'tradingview',
        includeBase64: true,
      };

      const expectedResult = {
        success: true,
        data: {
          totalImages: 1,
          platform: 'tradingview',
          screenshots: [
            {
              symbol: 'XAUUSD',
              timeframe: '4H',
              platform: 'tradingview',
              imageUrl: '/screenshots/XAUUSD_240_1234567890.png',
              base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
              metadata: {
                capturedAt: '2025-11-18T00:00:00Z',
                fileSize: '245KB',
                dimensions: '1920x1080',
              },
            },
          ],
          summary: {
            successful: 1,
            failed: 0,
            totalTime: '4.5s',
          },
        },
      };

      mockScreenshotsService.batchCapture.mockResolvedValue(expectedResult);

      const result = await controller.batchCapture(dto);

      expect(result.data.screenshots[0].base64).toBeDefined();
      expect(result.data.screenshots[0].base64).toContain('data:image/png;base64,');
    });

    it('debe manejar errores correctamente', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240'],
        platform: 'tradingview',
      };

      const error = new Error('Screenshot capture failed');
      mockScreenshotsService.batchCapture.mockRejectedValue(error);

      await expect(controller.batchCapture(dto)).rejects.toThrow(
        'Screenshot capture failed',
      );
    });

    it('debe respetar dimensiones personalizadas', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240'],
        platform: 'tradingview',
        width: 2560,
        height: 1440,
      };

      const expectedResult = {
        success: true,
        data: {
          totalImages: 1,
          platform: 'tradingview',
          screenshots: [
            {
              symbol: 'XAUUSD',
              timeframe: '4H',
              platform: 'tradingview',
              imageUrl: '/screenshots/XAUUSD_240_1234567890.png',
              metadata: {
                capturedAt: '2025-11-18T00:00:00Z',
                fileSize: '450KB',
                dimensions: '2560x1440',
              },
            },
          ],
          summary: {
            successful: 1,
            failed: 0,
            totalTime: '5.0s',
          },
        },
      };

      mockScreenshotsService.batchCapture.mockResolvedValue(expectedResult);

      const result = await controller.batchCapture(dto);

      expect(result.data.screenshots[0].metadata.dimensions).toBe('2560x1440');
    });
  });

  describe('POST /screenshots/single', () => {
    it('debe estar definido', () => {
      expect(controller.singleCapture).toBeDefined();
    });

    it('debe capturar un screenshot individual con TradingView', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      const expectedResult = {
        success: true,
        data: {
          symbol: 'XAUUSD',
          timeframe: '4H',
          platform: 'tradingview',
          imageUrl: '/screenshots/XAUUSD_240_1234567890.png',
          metadata: {
            capturedAt: '2025-11-18T00:00:00Z',
            fileSize: '245KB',
            dimensions: '1920x1080',
            totalTime: '4.2s',
          },
        },
      };

      mockScreenshotsService.singleCapture.mockResolvedValue(expectedResult);

      const result = await controller.singleCapture(dto);

      expect(result).toEqual(expectedResult);
      expect(mockScreenshotsService.singleCapture).toHaveBeenCalledWith(dto);
    });

    it('debe capturar un screenshot individual con Investing.com', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'EURUSD',
        timeframe: '60',
        platform: 'investing',
      };

      const expectedResult = {
        success: true,
        data: {
          symbol: 'EURUSD',
          timeframe: '1H',
          platform: 'investing',
          imageUrl: '/screenshots/EURUSD_60_1234567890.png',
          metadata: {
            capturedAt: '2025-11-18T00:00:00Z',
            fileSize: '238KB',
            dimensions: '1920x1080',
            totalTime: '5.1s',
          },
        },
      };

      mockScreenshotsService.singleCapture.mockResolvedValue(expectedResult);

      const result = await controller.singleCapture(dto);

      expect(result.data.platform).toBe('investing');
    });

    it('debe manejar diferentes timeframes', async () => {
      const timeframes = ['1', '5', '15', '60', '240', '1D'];

      for (const timeframe of timeframes) {
        const dto: SingleScreenshotDto = {
          symbol: 'XAUUSD',
          timeframe,
          platform: 'tradingview',
        };

        const expectedResult = {
          success: true,
          data: {
            symbol: 'XAUUSD',
            timeframe: timeframe,
            platform: 'tradingview',
            imageUrl: `/screenshots/XAUUSD_${timeframe}_1234567890.png`,
            metadata: {
              capturedAt: '2025-11-18T00:00:00Z',
              fileSize: '245KB',
              dimensions: '1920x1080',
              totalTime: '4.0s',
            },
          },
        };

        mockScreenshotsService.singleCapture.mockResolvedValue(expectedResult);

        const result = await controller.singleCapture(dto);

        expect(result.success).toBe(true);
      }
    });

    it('debe soportar formatos de imagen diferentes', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
        format: 'jpeg',
      };

      const expectedResult = {
        success: true,
        data: {
          symbol: 'XAUUSD',
          timeframe: '4H',
          platform: 'tradingview',
          imageUrl: '/screenshots/XAUUSD_240_1234567890.jpeg',
          metadata: {
            capturedAt: '2025-11-18T00:00:00Z',
            fileSize: '180KB',
            dimensions: '1920x1080',
            totalTime: '3.8s',
          },
        },
      };

      mockScreenshotsService.singleCapture.mockResolvedValue(expectedResult);

      const result = await controller.singleCapture(dto);

      expect(result.data.imageUrl).toContain('.jpeg');
    });

    it('debe manejar errores correctamente', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      const error = new Error('Failed to capture screenshot');
      mockScreenshotsService.singleCapture.mockRejectedValue(error);

      await expect(controller.singleCapture(dto)).rejects.toThrow(
        'Failed to capture screenshot',
      );
    });

    it('debe incluir tiempo total en metadata', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      const expectedResult = {
        success: true,
        data: {
          symbol: 'XAUUSD',
          timeframe: '4H',
          platform: 'tradingview',
          imageUrl: '/screenshots/XAUUSD_240_1234567890.png',
          metadata: {
            capturedAt: '2025-11-18T00:00:00Z',
            fileSize: '245KB',
            dimensions: '1920x1080',
            totalTime: '4.2s',
          },
        },
      };

      mockScreenshotsService.singleCapture.mockResolvedValue(expectedResult);

      const result = await controller.singleCapture(dto);

      expect(result.data.metadata.totalTime).toBeDefined();
      expect(result.data.metadata.totalTime).toMatch(/\d+\.?\d*s/);
    });
  });
});
