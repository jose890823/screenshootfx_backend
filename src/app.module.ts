import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScreenshotsModule } from './modules/screenshots/screenshots.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { HealthModule } from './modules/health/health.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Validación removida para compatibilidad con Railway
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Railway provee estas variables automáticamente cuando conectas PostgreSQL
      // O usa las credenciales de Supabase si las configuras en PG*
      host: process.env.PGHOST || process.env.DB_HOST,
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
      username: process.env.PGUSER || process.env.DB_USERNAME,
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
      database: process.env.PGDATABASE || process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production', // Auto-sync en desarrollo
      logging: process.env.NODE_ENV === 'development',
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false, // Railway/Supabase requieren SSL
    }),
    SupabaseModule, // Módulo global para Supabase Storage (opcional)
    ScreenshotsModule,
    ApiKeysModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
