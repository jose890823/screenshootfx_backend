// Mocks - IMPORTANTE: Los mocks deben ir ANTES de cualquier import
const mockBrowser = {
  newPage: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockPage = {
  goto: jest.fn().mockResolvedValue(undefined),
  setViewport: jest.fn().mockResolvedValue(undefined),
  waitForSelector: jest.fn().mockResolvedValue(undefined),
  screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot-data')),
  evaluate: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockLaunch = jest.fn().mockResolvedValue(mockBrowser);

jest.mock('puppeteer', () => ({
  launch: mockLaunch,
}));

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ScreenshotsService } from './screenshots.service';
import { PlatformFactory } from '../../common/utils/platform.factory';
import { BatchScreenshotDto } from './dto/batch-screenshot.dto';
import { SingleScreenshotDto } from './dto/single-screenshot.dto';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

describe('ScreenshotsService', () => {
  let service: ScreenshotsService;
  let platformFactory: PlatformFactory;

  // Aumentar timeout para todos los tests que usan Puppeteer (tienen delays de 2s)
  jest.setTimeout(10000);

  const mockPlatformHelper = {
    buildUrl: jest.fn(),
    getChartSelector: jest.fn().mockReturnValue('.chart-container'),
    getElementsToRemove: jest.fn().mockReturnValue(['.header', '.sidebar']),
    getWaitTimeout: jest.fn().mockReturnValue(30000),
    getPlatformName: jest.fn().mockReturnValue('tradingview'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenshotsService,
        {
          provide: PlatformFactory,
          useValue: {
            create: jest.fn().mockReturnValue(mockPlatformHelper),
          },
        },
      ],
    }).compile();

    service = module.get<ScreenshotsService>(ScreenshotsService);
    platformFactory = module.get<PlatformFactory>(PlatformFactory);

    // Setup mock browser behavior
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.screenshot.mockResolvedValue(Buffer.from('fake-screenshot-data'));

    jest.clearAllMocks();
  });

  describe('batchCapture', () => {
    it('debe estar definido', () => {
      expect(service).toBeDefined();
      expect(service.batchCapture).toBeDefined();
    });

    it('debe capturar múltiples screenshots exitosamente', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240', '60'],
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD&interval=240',
      );

      const result = await service.batchCapture(dto);

      expect(result.success).toBe(true);
      expect(result.data.totalImages).toBe(2);
      expect(result.data.platform).toBe('tradingview');
      expect(result.data.screenshots).toHaveLength(2);
      expect(result.data.summary.successful).toBe(2);
      expect(result.data.summary.failed).toBe(0);
    });

    it('debe procesar screenshots en paralelo con límite de concurrencia', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'],
        timeframes: ['240'],
        platform: 'tradingview',
      };

      process.env.MAX_CONCURRENT_SCREENSHOTS = '2';

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      const result = await service.batchCapture(dto);

      expect(result.data.totalImages).toBe(4);
      expect(result.data.summary.successful).toBe(4);
    });

    it('debe funcionar con Investing.com', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240'],
        platform: 'investing',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.investing.com/currencies/xau-usd-chart',
      );
      mockPlatformHelper.getPlatformName.mockReturnValue('investing');

      const result = await service.batchCapture(dto);

      expect(result.data.platform).toBe('investing');
      expect(platformFactory.create).toHaveBeenCalledWith('investing');
    });

    it('debe manejar errores parciales correctamente', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD', 'EURUSD'],
        timeframes: ['240'],
        platform: 'tradingview',
      };

      // Simular que el segundo screenshot falla
      let callCount = 0;
      mockPage.screenshot.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Screenshot failed');
        }
        return Promise.resolve(Buffer.from('fake-data'));
      });

      const result = await service.batchCapture(dto);

      expect(result.data.summary.successful).toBe(1);
      expect(result.data.summary.failed).toBe(1);
      expect(result.data.screenshots).toHaveLength(1);
    });

    it('debe incluir base64 cuando se solicita', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240'],
        platform: 'tradingview',
        includeBase64: true,
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      const result = await service.batchCapture(dto);

      expect(result.data.screenshots[0].base64).toBeDefined();
      expect(result.data.screenshots[0].base64).toContain('data:image/');
      expect(result.data.screenshots[0].base64).toContain('base64,');
    });

    it('debe incluir tiempo total en summary', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240'],
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      const result = await service.batchCapture(dto);

      expect(result.data.summary.totalTime).toBeDefined();
      expect(result.data.summary.totalTime).toMatch(/\d+\.?\d*s/);
    });
  });

  describe('singleCapture', () => {
    it('debe capturar un screenshot individual exitosamente', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD&interval=240',
      );

      const result = await service.singleCapture(dto);

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('XAUUSD');
      expect(result.data.timeframe).toBe('4H');
      expect(result.data.platform).toBe('tradingview');
      expect(result.data.imageUrl).toBeDefined();
      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata.totalTime).toBeDefined();
    });

    it('debe usar dimensiones personalizadas', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
        width: 2560,
        height: 1440,
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      await service.singleCapture(dto);

      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 2560,
        height: 1440,
      });
    });

    it('debe usar formato de imagen personalizado', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
        format: 'jpeg',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      await service.singleCapture(dto);

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: 'jpeg',
        fullPage: false,
      });
    });
  });

  describe('captureScreenshot (método privado - via singleCapture)', () => {
    it('debe lanzar Puppeteer con argumentos correctos', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      await service.singleCapture(dto);

      expect(mockLaunch).toHaveBeenCalledWith({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    });

    it('debe navegar a la URL correcta', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      const expectedUrl = 'https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD&interval=240';
      mockPlatformHelper.buildUrl.mockReturnValue(expectedUrl);

      await service.singleCapture(dto);

      expect(mockPage.goto).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          waitUntil: 'networkidle2',
        }),
      );
    });

    it('debe esperar por el selector del gráfico', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );
      mockPlatformHelper.getChartSelector.mockReturnValue('.chart-container');

      await service.singleCapture(dto);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '.chart-container',
        expect.any(Object),
      );
    });

    it('debe limpiar elementos de UI', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );
      mockPlatformHelper.getElementsToRemove.mockReturnValue([
        '.header',
        '.sidebar',
        '.toast',
      ]);

      await service.singleCapture(dto);

      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.any(Function),
        ['.header', '.sidebar', '.toast'],
      );
    });

    it('debe guardar el screenshot en el sistema de archivos', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      await service.singleCapture(dto);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toContain('XAUUSD_240_');
      expect(writeCall[0]).toContain('.png');
    });

    it('debe cerrar el navegador después de capturar', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      await service.singleCapture(dto);

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('debe reintentar hasta 3 veces en caso de error', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      // Simular 2 fallos y luego éxito
      let attempts = 0;
      mockPage.screenshot.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Screenshot failed');
        }
        return Promise.resolve(Buffer.from('success'));
      });

      const result = await service.singleCapture(dto);

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it('debe lanzar error después de 3 intentos fallidos', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      // Simular fallos continuos
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

      await expect(service.singleCapture(dto)).rejects.toThrow(BadRequestException);
    });

    it('debe cerrar el navegador incluso si hay error', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      mockPage.screenshot.mockRejectedValue(new Error('Fatal error'));

      try {
        await service.singleCapture(dto);
      } catch (e) {
        // Error esperado
      }

      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('formatTimeframe', () => {
    it('debe formatear timeframes correctamente', async () => {
      const testCases = [
        { input: '1', expected: '1M' },
        { input: '5', expected: '5M' },
        { input: '15', expected: '15M' },
        { input: '30', expected: '30M' },
        { input: '60', expected: '1H' },
        { input: '240', expected: '4H' },
        { input: '1D', expected: '1D' },
        { input: 'D', expected: '1D' },
      ];

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      for (const testCase of testCases) {
        const dto: SingleScreenshotDto = {
          symbol: 'XAUUSD',
          timeframe: testCase.input,
          platform: 'tradingview',
        };

        const result = await service.singleCapture(dto);

        expect(result.data.timeframe).toBe(testCase.expected);
      }
    });
  });

  describe('Metadata', () => {
    it('debe incluir metadata completa en el screenshot', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      const result = await service.singleCapture(dto);

      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata.capturedAt).toBeDefined();
      expect(result.data.metadata.fileSize).toBeDefined();
      expect(result.data.metadata.dimensions).toBeDefined();
      expect(result.data.metadata.totalTime).toBeDefined();
    });

    it('debe calcular el tamaño del archivo correctamente', async () => {
      const dto: SingleScreenshotDto = {
        symbol: 'XAUUSD',
        timeframe: '240',
        platform: 'tradingview',
      };

      mockPlatformHelper.buildUrl.mockReturnValue(
        'https://www.tradingview.com/chart/',
      );

      const fakeBuffer = Buffer.from('x'.repeat(250000)); // ~250KB
      mockPage.screenshot.mockResolvedValue(fakeBuffer);

      const result = await service.singleCapture(dto);

      expect(result.data.metadata.fileSize).toContain('KB');
    });
  });

  describe('Storage', () => {
    it('debe crear el directorio de storage si no existe', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ScreenshotsService,
          {
            provide: PlatformFactory,
            useValue: {
              create: jest.fn().mockReturnValue(mockPlatformHelper),
            },
          },
        ],
      }).compile();

      const newService = module.get<ScreenshotsService>(ScreenshotsService);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('screenshots'),
        { recursive: true },
      );
    });
  });
});
