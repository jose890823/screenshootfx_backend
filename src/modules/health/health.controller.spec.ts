import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService, HealthResponse } from './health.service';
import { HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockHealthService = {
    checkHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);

    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('debe estar definido', () => {
      expect(controller).toBeDefined();
      expect(controller.checkHealth).toBeDefined();
    });

    it('debe retornar status "ok" cuando todos los checks pasan', async () => {
      const mockResponse: HealthResponse = {
        status: 'ok',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '1h 30m 45s',
        checks: {
          api: {
            status: 'up',
            message: 'NestJS app is running',
            metadata: {
              nodeVersion: 'v18.17.0',
              platform: 'linux',
              environment: 'test',
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
              database: 'test_db',
            },
          },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(mockResponse);

      const result = await controller.checkHealth();

      expect(result.status).toBe('ok');
      expect(result.checks.api.status).toBe('up');
      expect(result.checks.puppeteer.status).toBe('up');
      expect(result.checks.storage.status).toBe('up');
      expect(result.checks.database.status).toBe('up');
      expect(mockHealthService.checkHealth).toHaveBeenCalledTimes(1);
    });

    it('debe retornar status 503 cuando hay componentes down', async () => {
      const mockResponse: HealthResponse = {
        status: 'error',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '1h 30m 45s',
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
            status: 'up',
            message: 'Storage directory is accessible and writable',
          },
          database: {
            status: 'up',
            message: 'PostgreSQL connection active',
          },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(mockResponse);

      const result = await controller.checkHealth();

      expect(result.status).toBe('error');
      expect(result['statusCode']).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.checks.puppeteer.status).toBe('down');
    });

    it('debe retornar status 503 cuando la base de datos está down', async () => {
      const mockResponse: HealthResponse = {
        status: 'error',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '1h 30m 45s',
        checks: {
          api: {
            status: 'up',
            message: 'NestJS app is running',
          },
          puppeteer: {
            status: 'up',
            message: 'Chromium can be launched successfully',
          },
          storage: {
            status: 'up',
            message: 'Storage directory is accessible and writable',
          },
          database: {
            status: 'down',
            message: 'Database connection failed',
            error: 'Connection refused',
          },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(mockResponse);

      const result = await controller.checkHealth();

      expect(result.status).toBe('error');
      expect(result['statusCode']).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.checks.database.status).toBe('down');
    });

    it('debe retornar status 503 cuando storage está down', async () => {
      const mockResponse: HealthResponse = {
        status: 'error',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '1h 30m 45s',
        checks: {
          api: {
            status: 'up',
            message: 'NestJS app is running',
          },
          puppeteer: {
            status: 'up',
            message: 'Chromium can be launched successfully',
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
      };

      mockHealthService.checkHealth.mockResolvedValue(mockResponse);

      const result = await controller.checkHealth();

      expect(result.status).toBe('error');
      expect(result['statusCode']).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.checks.storage.status).toBe('down');
    });

    it('debe incluir timestamp y uptime en la respuesta', async () => {
      const mockResponse: HealthResponse = {
        status: 'ok',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '1h 30m 45s',
        checks: {
          api: { status: 'up', message: 'OK' },
          puppeteer: { status: 'up', message: 'OK' },
          storage: { status: 'up', message: 'OK' },
          database: { status: 'up', message: 'OK' },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(mockResponse);

      const result = await controller.checkHealth();

      expect(result.timestamp).toBe('2025-11-17T23:45:00.000Z');
      expect(result.uptime).toBe('1h 30m 45s');
    });

    it('debe incluir metadata en los checks exitosos', async () => {
      const mockResponse: HealthResponse = {
        status: 'ok',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '1h 30m 45s',
        checks: {
          api: {
            status: 'up',
            message: 'NestJS app is running',
            metadata: {
              nodeVersion: 'v18.17.0',
              platform: 'linux',
            },
          },
          puppeteer: {
            status: 'up',
            message: 'Chromium can be launched successfully',
            metadata: {
              version: 'Chrome/120.0.6099.109',
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
            },
          },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(mockResponse);

      const result = await controller.checkHealth();

      expect(result.checks.api.metadata).toBeDefined();
      expect(result.checks.puppeteer.metadata).toBeDefined();
      expect(result.checks.storage.metadata).toBeDefined();
      expect(result.checks.database.metadata).toBeDefined();
    });

    it('debe manejar status "degraded" correctamente', async () => {
      const mockResponse: HealthResponse = {
        status: 'degraded',
        timestamp: '2025-11-17T23:45:00.000Z',
        uptime: '1h 30m 45s',
        checks: {
          api: { status: 'up', message: 'OK' },
          puppeteer: { status: 'up', message: 'OK' },
          storage: { status: 'up', message: 'OK' },
          database: { status: 'up', message: 'OK' },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(mockResponse);

      const result = await controller.checkHealth();

      // Status degraded no debería retornar 503, solo error
      expect(result.status).toBe('degraded');
      expect(result['statusCode']).toBeUndefined();
    });
  });
});
