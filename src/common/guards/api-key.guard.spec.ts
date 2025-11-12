import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockExecutionContext: ExecutionContext;

  const originalEnv = process.env.API_KEY;

  beforeEach(() => {
    guard = new ApiKeyGuard();

    // Mock del ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {},
        }),
      }),
    } as any;
  });

  afterEach(() => {
    // Restaurar variable de entorno
    process.env.API_KEY = originalEnv;
  });

  it('debe estar definido', () => {
    expect(guard).toBeDefined();
  });

  it('debe permitir acceso con API Key válida', () => {
    process.env.API_KEY = 'test-api-key-123';

    const mockRequest = {
      headers: {
        'x-api-key': 'test-api-key-123',
      },
    };

    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    });

    const result = guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });

  it('debe rechazar request sin API Key', () => {
    process.env.API_KEY = 'test-api-key-123';

    const mockRequest = {
      headers: {},
    };

    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    });

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      UnauthorizedException,
    );
  });

  it('debe rechazar request con API Key inválida', () => {
    process.env.API_KEY = 'test-api-key-123';

    const mockRequest = {
      headers: {
        'x-api-key': 'wrong-api-key',
      },
    };

    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    });

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      UnauthorizedException,
    );
  });

  it('debe rechazar si no hay API_KEY configurada en el servidor', () => {
    delete process.env.API_KEY;

    const mockRequest = {
      headers: {
        'x-api-key': 'any-key',
      },
    };

    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    });

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      UnauthorizedException,
    );
  });
});
