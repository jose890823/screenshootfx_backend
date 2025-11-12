import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

/**
 * Guard para validar API Key en los requests
 * Valida contra la base de datos de API Keys con bcrypt
 * ACTUALIZADO: Ahora usa sistema robusto con BD en lugar de .env
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    // Validar que el header incluya la API Key
    if (!apiKey) {
      this.logger.warn('Request sin API Key detectado');
      throw new UnauthorizedException(
        'API Key requerida. Incluya el header x-api-key en su request.',
      );
    }

    // Validar contra la base de datos
    const validKey = await this.apiKeysService.validateApiKey(apiKey);

    if (!validKey) {
      this.logger.warn('Intento de acceso con API Key inválida');
      throw new UnauthorizedException('API Key inválida o expirada.');
    }

    // Agregar información de la key al request para uso posterior
    request['apiKey'] = validKey;

    return true;
  }
}
