import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let repository: jest.Mocked<Repository<ApiKey>>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    repository = module.get(getRepositoryToken(ApiKey));
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear una nueva API Key exitosamente', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Test Key',
        rateLimit: 100,
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        id: '123',
        name: 'Test Key',
        keyHash: 'hashed',
        keyPrefix: 'sk_live_',
        isActive: true,
        rateLimit: 100,
        usageCount: 0,
        createdAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      } as any);

      repository.save.mockResolvedValue({
        id: '123',
        name: 'Test Key',
        keyHash: 'hashed',
        keyPrefix: 'sk_live_',
        isActive: true,
        rateLimit: 100,
        usageCount: 0,
        createdAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      } as any);

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Key');
      expect(result.key).toBeDefined();
      expect(result.key).toContain('sk_live_');
      expect(result.keyPrefix).toBe('sk_live_');
      expect(repository.save).toHaveBeenCalled();
    });

    it('debe rechazar nombre duplicado', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Existing Key',
        rateLimit: 100,
      };

      repository.findOne.mockResolvedValue({
        id: '123',
        name: 'Existing Key',
      } as any);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('debe crear key con fecha de expiración', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Expiring Key',
        expiresAt: '2025-12-31T23:59:59Z',
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({} as any);
      repository.save.mockResolvedValue({
        id: '123',
        name: 'Expiring Key',
        keyPrefix: 'sk_live_',
        expiresAt: new Date('2025-12-31T23:59:59Z'),
      } as any);

      const result = await service.create(dto);
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('validateApiKey', () => {
    it('debe validar API Key correcta', async () => {
      const testKey = 'sk_live_test123';
      const hashedKey = await bcrypt.hash(testKey, 10);

      repository.find.mockResolvedValue([
        {
          id: '123',
          keyHash: hashedKey,
          isActive: true,
          expiresAt: null,
          lastUsedAt: null,
          usageCount: 0,
        } as any,
      ]);

      repository.save.mockResolvedValue({} as any);

      const result = await service.validateApiKey(testKey);

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(repository.save).toHaveBeenCalled();
    });

    it('debe rechazar API Key incorrecta', async () => {
      repository.find.mockResolvedValue([
        {
          keyHash: await bcrypt.hash('different_key', 10),
          isActive: true,
        } as any,
      ]);

      const result = await service.validateApiKey('sk_live_wrong_key');
      expect(result).toBeNull();
    });

    it('debe rechazar API Key sin prefijo sk_live_', async () => {
      const result = await service.validateApiKey('invalid_prefix_key');
      expect(result).toBeNull();
    });

    it('debe rechazar API Key expirada', async () => {
      const testKey = 'sk_live_test123';
      const hashedKey = await bcrypt.hash(testKey, 10);

      repository.find.mockResolvedValue([
        {
          id: '123',
          keyHash: hashedKey,
          isActive: true,
          expiresAt: new Date('2020-01-01'), // Fecha pasada
        } as any,
      ]);

      const result = await service.validateApiKey(testKey);
      expect(result).toBeNull();
    });

    it('debe actualizar lastUsedAt y usageCount', async () => {
      const testKey = 'sk_live_test123';
      const hashedKey = await bcrypt.hash(testKey, 10);

      const mockKey = {
        id: '123',
        keyHash: hashedKey,
        isActive: true,
        expiresAt: null,
        lastUsedAt: null,
        usageCount: 5,
      } as any;

      repository.find.mockResolvedValue([mockKey]);
      repository.save.mockResolvedValue(mockKey);

      await service.validateApiKey(testKey);

      expect(mockKey.usageCount).toBe(6);
      expect(mockKey.lastUsedAt).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('debe retornar todas las API Keys', async () => {
      repository.find.mockResolvedValue([
        {
          id: '123',
          name: 'Key 1',
          keyPrefix: 'sk_live_',
          isActive: true,
          createdAt: new Date(),
        } as any,
        {
          id: '456',
          name: 'Key 2',
          keyPrefix: 'sk_live_',
          isActive: false,
          createdAt: new Date(),
        } as any,
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Key 1');
      expect(result[1].name).toBe('Key 2');
    });
  });

  describe('findOne', () => {
    it('debe retornar una API Key por ID', async () => {
      repository.findOne.mockResolvedValue({
        id: '123',
        name: 'Test Key',
        keyPrefix: 'sk_live_',
      } as any);

      const result = await service.findOne('123');

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('debe revocar una API Key', async () => {
      const mockKey = {
        id: '123',
        name: 'Test Key',
        isActive: true,
      } as any;

      repository.findOne.mockResolvedValue(mockKey);
      repository.save.mockResolvedValue({ ...mockKey, isActive: false });

      const result = await service.revoke('123');

      expect(result.message).toContain('revocada exitosamente');
      expect(mockKey.isActive).toBe(false);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.revoke('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('debe eliminar permanentemente una API Key', async () => {
      const mockKey = {
        id: '123',
        name: 'Test Key',
      } as any;

      repository.findOne.mockResolvedValue(mockKey);
      repository.remove.mockResolvedValue(mockKey);

      const result = await service.remove('123');

      expect(result.message).toContain('eliminada permanentemente');
      expect(repository.remove).toHaveBeenCalledWith(mockKey);
    });
  });

  describe('cleanExpiredKeys', () => {
    it('debe desactivar keys expiradas', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: '1', isActive: true, expiresAt: new Date('2020-01-01') },
          { id: '2', isActive: true, expiresAt: new Date('2020-01-02') },
        ]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      repository.save.mockResolvedValue([] as any);

      const result = await service.cleanExpiredKeys();

      expect(result.removed).toBe(2);
      expect(repository.save).toHaveBeenCalled();
    });

    it('debe retornar 0 si no hay keys expiradas', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanExpiredKeys();

      expect(result.removed).toBe(0);
    });
  });
});
