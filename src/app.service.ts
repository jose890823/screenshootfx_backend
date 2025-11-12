import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Screenshot Service API - Documentación en /api/docs';
  }
}
