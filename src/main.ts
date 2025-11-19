import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Función helper para enmascarar valores sensibles en logs
 */
function maskSensitiveValue(value: string | undefined): string {
  if (!value) return '❌ NO CONFIGURADO';
  if (value.length <= 8) return '****';
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

/**
 * Función helper para verificar y loggear variables de entorno
 */
function logEnvironmentVariables() {
  console.log('\n=================================================');
  console.log('📋 VERIFICACIÓN DE VARIABLES DE ENTORNO');
  console.log('=================================================\n');

  // Configuración básica
  console.log('🔧 CONFIGURACIÓN BÁSICA:');
  console.log(`  PORT: ${process.env.PORT || '3000'} ${process.env.PORT ? '✅' : '⚠️ (usando default)'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'} ${process.env.NODE_ENV ? '✅' : '⚠️ (usando default)'}`);

  // Seguridad
  console.log('\n🔐 SEGURIDAD:');
  console.log(`  MASTER_KEY: ${maskSensitiveValue(process.env.MASTER_KEY)} ${process.env.MASTER_KEY ? '✅' : '❌'}`);

  // Base de Datos (Railway usa PG*, con fallback a DB_*)
  console.log('\n🗄️  BASE DE DATOS:');
  console.log(`  PGHOST: ${process.env.PGHOST || '❌ NO CONFIGURADO'} ${process.env.PGHOST ? '✅' : '❌'}`);
  console.log(`  PGPORT: ${process.env.PGPORT || '5432'} ${process.env.PGPORT ? '✅' : '⚠️ (usando default)'}`);
  console.log(`  PGUSER: ${process.env.PGUSER || '❌ NO CONFIGURADO'} ${process.env.PGUSER ? '✅' : '❌'}`);
  console.log(`  PGPASSWORD: ${maskSensitiveValue(process.env.PGPASSWORD)} ${process.env.PGPASSWORD ? '✅' : '❌'}`);
  console.log(`  PGDATABASE: ${process.env.PGDATABASE || '❌ NO CONFIGURADO'} ${process.env.PGDATABASE ? '✅' : '❌'}`);

  // Puppeteer
  console.log('\n🤖 PUPPETEER:');
  console.log(`  MAX_CONCURRENT_SCREENSHOTS: ${process.env.MAX_CONCURRENT_SCREENSHOTS || '3'} ${process.env.MAX_CONCURRENT_SCREENSHOTS ? '✅' : '⚠️ (usando default)'}`);
  console.log(`  SCREENSHOT_TIMEOUT: ${process.env.SCREENSHOT_TIMEOUT || '30000'}ms ${process.env.SCREENSHOT_TIMEOUT ? '✅' : '⚠️ (usando default)'}`);
  console.log(`  MAX_BATCH_SIZE: ${process.env.MAX_BATCH_SIZE || '20'} ${process.env.MAX_BATCH_SIZE ? '✅' : '⚠️ (usando default)'}`);

  // Storage
  console.log('\n💾 STORAGE:');
  console.log(`  STORAGE_TYPE: ${process.env.STORAGE_TYPE || 'local'} ${process.env.STORAGE_TYPE ? '✅' : '⚠️ (usando default)'}`);
  console.log(`  STORAGE_PATH: ${process.env.STORAGE_PATH || './storage/screenshots'} ${process.env.STORAGE_PATH ? '✅' : '⚠️ (usando default)'}`);

  // AWS S3 (opcional)
  if (process.env.STORAGE_TYPE === 's3') {
    console.log('\n☁️  AWS S3 (requerido para STORAGE_TYPE=s3):');
    console.log(`  AWS_ACCESS_KEY_ID: ${maskSensitiveValue(process.env.AWS_ACCESS_KEY_ID)} ${process.env.AWS_ACCESS_KEY_ID ? '✅' : '❌'}`);
    console.log(`  AWS_SECRET_ACCESS_KEY: ${maskSensitiveValue(process.env.AWS_SECRET_ACCESS_KEY)} ${process.env.AWS_SECRET_ACCESS_KEY ? '✅' : '❌'}`);
    console.log(`  AWS_REGION: ${process.env.AWS_REGION || '❌ NO CONFIGURADO'} ${process.env.AWS_REGION ? '✅' : '❌'}`);
    console.log(`  AWS_BUCKET: ${process.env.AWS_BUCKET || '❌ NO CONFIGURADO'} ${process.env.AWS_BUCKET ? '✅' : '❌'}`);
  }

  console.log('\n=================================================\n');

  // Verificar variables críticas (Railway usa PG*, con fallback a DB_*)
  const criticalVars = [
    'MASTER_KEY',
  ];

  // Verificar que al menos las variables PG* O DB_* estén configuradas
  const hasPgVars = process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE;
  const hasDbVars = process.env.DB_HOST && process.env.DB_USERNAME && process.env.DB_PASSWORD && process.env.DB_DATABASE;

  const missingVars = criticalVars.filter((varName) => !process.env[varName]);

  if (!hasPgVars && !hasDbVars) {
    missingVars.push('Database variables (PGHOST/PGUSER/PGPASSWORD/PGDATABASE or DB_HOST/DB_USERNAME/DB_PASSWORD/DB_DATABASE)');
  }

  if (missingVars.length > 0) {
    console.error('❌ ERROR: Variables críticas faltantes:');
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\n⚠️  La aplicación puede no funcionar correctamente.\n');
  } else {
    console.log('✅ Todas las variables críticas están configuradas.\n');
  }
}

async function bootstrap() {
  // Loggear variables de entorno ANTES de crear la app
  logEnvironmentVariables();

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

  console.log('\n=================================================');
  console.log('🚀 APLICACIÓN INICIADA EXITOSAMENTE');
  console.log('=================================================');
  console.log(`📍 URL: http://localhost:${port}`);
  console.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('=================================================\n');
}
bootstrap();
