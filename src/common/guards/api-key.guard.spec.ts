import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockApiKeysService: jest.Mocked<ApiKeysService>;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    // Mock del ApiKeysService
    mockApiKeysService = {
      validateApiKey: jest.fn(),
    } as any;

    guard = new ApiKeyGuard(mockApiKeysService);

    // Mock del ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {},
        }),
      }),
    } as any;
  });

  it('debe estar definido', () => {
    expect(guard).toBeDefined();
  });

  it('debe permitir acceso con API Key válida', async () => {
    const mockApiKey = {
      id: '123',
      name: 'Test Key',
      isActive: true,
    };

    mockApiKeysService.validateApiKey.mockResolvedValue(mockApiKey as any);

    const mockRequest = {
      headers: {
        'x-api-key': 'sk_live_valid_key_123',
      },
    };

    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    });

    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
    expect(mockApiKeysService.validateApiKey).toHaveBeenCalledWith(
      'sk_live_valid_key_123',
    );
  });

  it('debe rechazar request sin API Key', async () => {
    const mockRequest = {
      headers: {},
    };

    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    });

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe rechazar request con API Key inválida', async () => {
    mockApiKeysService.validateApiKey.mockResolvedValue(null);

    const mockRequest = {
      headers: {
        'x-api-key': 'sk_live_invalid_key',
      },
    };

    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    });

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe agregar información de la key al request cuando es válida', async () => {
    const mockApiKey = {
      id: '123',
      name: 'Test Key',
      isActive: true,
    };

    mockApiKeysService.validateApiKey.mockResolvedValue(mockApiKey as any);

    const mockRequest = {
      headers: {
        'x-api-key': 'sk_live_valid_key_123',
      },
    };

    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    });

    await guard.canActivate(mockExecutionContext);
    expect(mockRequest['apiKey']).toEqual(mockApiKey);
  });
});
