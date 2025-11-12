import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';

/**
 * Módulo para gestión de API Keys
 */
@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService], // Exportar para usar en ApiKeyGuard
})
export class ApiKeysModule {}
