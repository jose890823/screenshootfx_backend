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
    .addTag('screenshots', 'Endpoints de captura de screenshots')
    .addTag('health', 'Health checks del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Habilitar CORS para desarrollo
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Aplicación corriendo en: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`📚 Swagger disponible en: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
