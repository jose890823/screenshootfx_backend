import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  validateSync,
  IsNotEmpty,
} from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Enum de entornos permitidos
 */
enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Enum de tipos de storage permitidos
 */
enum StorageType {
  Local = 'local',
  S3 = 's3',
  Cloudinary = 'cloudinary',
}

/**
 * Clase de validación de variables de entorno
 * Esta clase valida que todas las variables de entorno requeridas estén presentes
 * y tengan el formato correcto al iniciar la aplicación
 */
export class EnvironmentVariables {
  // Configuración básica de la aplicación
  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  // Seguridad
  @IsString()
  @IsNotEmpty()
  MASTER_KEY: string;

  // Base de Datos PostgreSQL
  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsNumber()
  @IsOptional()
  DB_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string;

  // Puppeteer
  @IsNumber()
  @IsOptional()
  MAX_CONCURRENT_SCREENSHOTS: number = 3;

  @IsNumber()
  @IsOptional()
  SCREENSHOT_TIMEOUT: number = 30000;

  @IsNumber()
  @IsOptional()
  MAX_BATCH_SIZE: number = 20;

  // Storage
  @IsEnum(StorageType)
  @IsOptional()
  STORAGE_TYPE: StorageType = StorageType.Local;

  @IsString()
  @IsOptional()
  STORAGE_PATH: string = './storage/screenshots';

  // AWS S3 (Opcional - solo si STORAGE_TYPE = 's3')
  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  AWS_REGION?: string;

  @IsString()
  @IsOptional()
  AWS_BUCKET?: string;
}

/**
 * Función de validación de variables de entorno
 * Se ejecuta al inicio de la aplicación y lanza un error si alguna variable requerida falta
 */
export function validate(config: Record<string, unknown>) {
  console.log('🔍 DEBUG: Variables recibidas en validate():');
  console.log('  Total de keys:', Object.keys(config).length);
  console.log('  NODE_ENV:', config.NODE_ENV || 'NOT SET');
  console.log('  PORT:', config.PORT || 'NOT SET');
  console.log('  MASTER_KEY:', config.MASTER_KEY ? 'SET (hidden)' : 'NOT SET');
  console.log('  DB_HOST:', config.DB_HOST || 'NOT SET');
  console.log('  DB_USERNAME:', config.DB_USERNAME || 'NOT SET');
  console.log('  DB_DATABASE:', config.DB_DATABASE || 'NOT SET');
  console.log('');

  // Convertir números de string a number
  const processedConfig = {
    ...config,
    PORT: config.PORT ? parseInt(config.PORT as string, 10) : 3000,
    DB_PORT: config.DB_PORT ? parseInt(config.DB_PORT as string, 10) : 5432,
    MAX_CONCURRENT_SCREENSHOTS: config.MAX_CONCURRENT_SCREENSHOTS
      ? parseInt(config.MAX_CONCURRENT_SCREENSHOTS as string, 10)
      : 3,
    SCREENSHOT_TIMEOUT: config.SCREENSHOT_TIMEOUT
      ? parseInt(config.SCREENSHOT_TIMEOUT as string, 10)
      : 30000,
    MAX_BATCH_SIZE: config.MAX_BATCH_SIZE
      ? parseInt(config.MAX_BATCH_SIZE as string, 10)
      : 20,
  };

  const validatedConfig = plainToClass(
    EnvironmentVariables,
    processedConfig,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'Unknown error';
        return `❌ ${error.property}: ${constraints}`;
      })
      .join('\n');

    console.error('\n❌ VALIDACIÓN DE VARIABLES DE ENTORNO FALLIDA:');
    console.error(errorMessages);
    console.error('\n📋 INSTRUCCIONES PARA RAILWAY:');
    console.error('1. Ve a tu proyecto en Railway (https://railway.app)');
    console.error('2. Selecciona tu servicio');
    console.error('3. Ve a la pestaña "Variables"');
    console.error('4. Agrega estas variables (copia exactamente los nombres):');
    console.error('   - MASTER_KEY=tu-master-key-aqui');
    console.error('   - DB_HOST=tu-host-de-postgres');
    console.error('   - DB_PORT=5432');
    console.error('   - DB_USERNAME=postgres');
    console.error('   - DB_PASSWORD=tu-password');
    console.error('   - DB_DATABASE=screenshoot_fx');
    console.error('   - NODE_ENV=production');
    console.error('   - PORT=3000');
    console.error('5. Railway reiniciará automáticamente el servicio\n');

    throw new Error(
      `❌ VALIDACIÓN DE VARIABLES DE ENTORNO FALLIDA:\n\n${errorMessages}\n\n` +
        `Por favor verifica tu archivo .env o las variables de entorno en Railway/producción.`,
    );
  }

  console.log('✅ Validación de variables de entorno completada exitosamente\n');
  return validatedConfig;
}
