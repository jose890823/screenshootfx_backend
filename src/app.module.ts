import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScreenshotsModule } from './modules/screenshots/screenshots.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { HealthModule } from './modules/health/health.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate, // Validar variables de entorno al inicio
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production', // Auto-sync en desarrollo
      logging: process.env.NODE_ENV === 'development',
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false, // Railway requiere SSL
    }),
    ScreenshotsModule,
    ApiKeysModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// host: process.env.DB_HOST || 'localhost',
//       port: parseInt(process.env.DB_PORT || '5432', 10),
//       username: process.env.DB_USERNAME || 'postgres',
//       password: process.env.DB_PASSWORD || 'postgres',
//       database: process.env.DB_DATABASE || 'screenshoot_fx',
//       entities: [__dirname + '/**/*.entity{.ts,.js}'],
//       synchronize: process.env.NODE_ENV !== 'production', // Auto-sync en desarrollo
//       logging: process.env.NODE_ENV === 'development',
