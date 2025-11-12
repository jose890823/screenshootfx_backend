import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard para proteger endpoints de gestión de API Keys
 * Requiere una Master Key configurada en variables de entorno
 * Solo para administración, NO para uso regular de la API
 */
@Injectable()
export class MasterKeyGuard implements CanActivate {
  private readonly logger = new Logger(MasterKeyGuard.name);
  private readonly masterKey = process.env.MASTER_KEY;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-master-key'] as string;

    // Verificar que MASTER_KEY esté configurada
    if (!this.masterKey) {
      this.logger.error(
        'MASTER_KEY no configurada en variables de entorno. Endpoints de gestión deshabilitados.',
      );
      throw new UnauthorizedException(
        'Sistema de gestión de API Keys no configurado',
      );
    }

    // Verificar que se haya proporcionado una key
    if (!providedKey) {
      this.logger.warn('Intento de acceso sin Master Key');
      throw new UnauthorizedException('Master Key requerida');
    }

    // Comparar keys
    if (providedKey !== this.masterKey) {
      this.logger.warn('Intento de acceso con Master Key inválida');
      throw new UnauthorizedException('Master Key inválida');
    }

    this.logger.debug('Master Key validada correctamente');
    return true;
  }
}
