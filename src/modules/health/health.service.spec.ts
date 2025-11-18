// Mocks - IMPORTANTE: Los mocks deben ir ANTES de cualquier import
const mockBrowser = {
  version: jest.fn().mockResolvedValue('Chrome/120.0.6099.109'),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockLaunch = jest.fn().mockResolvedValue(mockBrowser);

jest.mock('puppeteer', () => ({
  launch: mockLaunch,
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  accessSync: jest.fn(),
  constants: {
    W_OK: 2,
    R_OK: 4,
  },
}));

// Mock de @nestjs/typeorm
jest.mock('@nestjs/typeorm', () => ({
  InjectDataSource: () => jest.fn(),
  TypeOrmModule: {
    forRoot: jest.fn(),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import * as fs from 'fs';

describe('HealthService', () => {
  let service: HealthService;
  let mockDataSource: any;

  beforeEach(async () => {
    // Mock DataSource
    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      options: {
        type: 'postgres',
        database: 'test_db',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: 'DataSource',
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);

    // Inyectar manualmente el dataSource (ya que @InjectDataSource está mockeado)
    service['dataSource'] = mockDataSource;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('debe retornar status "ok" cuando todos los checks pasan', async () => {
      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.status).toBe('ok');
      expect(result.checks.api.status).toBe('up');
      expect(result.checks.puppeteer.status).toBe('up');
      expect(result.checks.storage.status).toBe('up');
      expect(result.checks.database.status).toBe('up');
    });

    it('debe retornar status "error" cuando algún check falla', async () => {
      // Mock Puppeteer fallando
      mockLaunch.mockRejectedValue(
        new Error('Could not find Chrome executable'),
      );

      // Mock filesystem OK
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.status).toBe('error');
      expect(result.checks.puppeteer.status).toBe('down');
      expect(result.checks.puppeteer.error).toContain('Chrome executable');
    });

    it('debe incluir timestamp y uptime en la respuesta', async () => {
      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('string');
    });
  });

  describe('checkApi', () => {
    it('debe retornar status "up" con metadata del entorno', async () => {
      mockLaunch.mockResolvedValue(mockBrowser);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.checks.api.status).toBe('up');
      expect(result.checks.api.message).toBe('NestJS app is running');
      expect(result.checks.api.metadata).toBeDefined();
      expect(result.checks.api.metadata.nodeVersion).toBeDefined();
      expect(result.checks.api.metadata.platform).toBeDefined();
    });
  });

  describe('checkPuppeteer', () => {
    it('debe retornar status "up" cuando Chromium se puede lanzar', async () => {
      mockLaunch.mockResolvedValue(mockBrowser);

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.checks.puppeteer.status).toBe('up');
      expect(result.checks.puppeteer.message).toContain('Chromium');
      expect(result.checks.puppeteer.metadata.version).toBe('Chrome/120.0.6099.109');
      expect(result.checks.puppeteer.metadata.launchTime).toBeDefined();
    });

    it('debe retornar status "down" cuando Chromium falla al lanzar', async () => {
      mockLaunch.mockRejectedValue(
        new Error('Could not find Chrome executable'),
      );

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.checks.puppeteer.status).toBe('down');
      expect(result.checks.puppeteer.error).toContain('Chrome executable');
    });

    it('debe cerrar el navegador correctamente después del check', async () => {
      mockLaunch.mockResolvedValue(mockBrowser);

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      await service.checkHealth();

      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('checkStorage', () => {
    it('debe retornar status "up" cuando el directorio existe y es escribible', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      const result = await service.checkHealth();

      expect(result.checks.storage.status).toBe('up');
      expect(result.checks.storage.message).toContain('accessible and writable');
    });

    it('debe retornar status "down" cuando el directorio no existe', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      const result = await service.checkHealth();

      expect(result.checks.storage.status).toBe('down');
      expect(result.checks.storage.message).toContain('does not exist');
    });

    it('debe retornar status "down" cuando el directorio no es escribible', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      const result = await service.checkHealth();

      expect(result.checks.storage.status).toBe('down');
      expect(result.checks.storage.error).toContain('permission denied');
    });
  });

  describe('checkDatabase', () => {
    it('debe retornar status "up" cuando la conexión a PostgreSQL funciona', async () => {
      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.checks.database.status).toBe('up');
      expect(result.checks.database.message).toContain('PostgreSQL');
      expect(result.checks.database.metadata.responseTime).toBeDefined();
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('debe retornar status "down" cuando la conexión a PostgreSQL falla', async () => {
      (mockDataSource.query as jest.Mock).mockRejectedValue(
        new Error('Connection refused'),
      );

      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.checks.database.status).toBe('down');
      expect(result.checks.database.error).toContain('Connection refused');
    });

    it('debe medir el tiempo de respuesta de la base de datos', async () => {
      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.checks.database.metadata.responseTime).toMatch(/\d+ms/);
    });
  });

  describe('getUptime', () => {
    it('debe calcular el uptime correctamente', async () => {
      // Mock Puppeteer
      mockLaunch.mockResolvedValue(mockBrowser);

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('string');
      // El uptime debe ser muy corto ya que acabamos de crear el servicio
      expect(result.uptime).toMatch(/\d+s/);
    });
  });
});
