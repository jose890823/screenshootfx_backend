import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Guard para validar API Key en los requests
 * Verifica que el header 'x-api-key' coincida con la API_KEY configurada en .env
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    // Obtener API_KEY del environment
    const validApiKey = process.env.API_KEY;

    // Si no hay API_KEY configurada, denegar acceso por seguridad
    if (!validApiKey) {
      throw new UnauthorizedException(
        'API Key no configurada en el servidor. Contacte al administrador.',
      );
    }

    // Validar que el header incluya la API Key
    if (!apiKey) {
      throw new UnauthorizedException(
        'API Key requerida. Incluya el header x-api-key en su request.',
      );
    }

    // Validar que la API Key sea correcta
    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('API Key inválida.');
    }

    return true;
  }
}
