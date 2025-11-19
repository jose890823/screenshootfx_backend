import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración global de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de Swagger (OBLIGATORIO)
  const config = new DocumentBuilder()
    .setTitle('TradingView & Investing.com Screenshot Service')
    .setDescription(
      'API para captura automatizada de screenshots de gráficos financieros desde TradingView e Investing.com',
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addApiKey(
      { type: 'apiKey', name: 'x-master-key', in: 'header' },
      'master-key',
    )
    .addTag('screenshots', 'Endpoints de captura de screenshots')
    .addTag('api-keys', 'Gestión de API Keys (requiere Master Key)')
    .addTag('health', 'Health checks del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Habilitar CORS para desarrollo
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger API docs: http://localhost:${port}/api/docs`);
}
bootstrap();
