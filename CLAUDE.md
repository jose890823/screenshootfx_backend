# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con código en este repositorio.

## Descripción del Proyecto

**Servicio de Screenshots Multi-Plataforma para Trading** - Servicio backend basado en NestJS para captura automatizada de screenshots de gráficos financieros desde **TradingView** e **Investing.com**. Este servicio está diseñado para integrarse con Make.com y Claude AI para análisis técnico multi-timeframe usando Smart Money Concepts para trading algorítmico de XAUUSD y otros pares de divisas.

**Stack Tecnológico:**
- Backend: NestJS con TypeScript
- Navegador Headless: Puppeteer
- Base de Datos: PostgreSQL (opcional, para historial/logs)
- Almacenamiento: Sistema de archivos local + opcional S3/Cloudinary
- Seguridad: Autenticación por API Key
- **Documentación: Swagger/OpenAPI (OBLIGATORIO para todos los endpoints)**

## Comandos de Desarrollo

### Configuración Inicial
```bash
# Inicializar proyecto NestJS (siguiendo documentación oficial)
npm i -g @nestjs/cli
nest new nombre-proyecto --package-manager npm

# Instalar dependencias principales
npm install @nestjs/swagger swagger-ui-express class-validator class-transformer
npm install @nestjs/throttler puppeteer
npm install --save-dev @types/node

# IMPORTANTE: Configurar Swagger en main.ts desde el inicio
```

### Ejecutar la Aplicación
```bash
# Modo desarrollo con hot-reload
npm run start:dev

# Modo producción
npm run start:prod

# Modo debug
npm run start:debug

# Después de iniciar, acceder a Swagger en:
# http://localhost:3000/api/docs
```

### Testing (OBLIGATORIO)
```bash
# Tests unitarios (DEBE ejecutarse SIEMPRE antes de commit)
npm run test

# Tests E2E
npm run test:e2e

# Cobertura de tests (objetivo: >80%)
npm run test:cov

# Ejecutar archivo de test específico
npm run test -- screenshots.service.spec.ts

# Watch mode durante desarrollo
npm run test:watch

# IMPORTANTE: Los tests deben pasar al 100% antes de considerar un endpoint completo
```

**Comandos de Verificación antes de Commit:**
```bash
# 1. Ejecutar tests
npm run test

# 2. Verificar cobertura
npm run test:cov

# 3. Lint del código
npm run lint

# 4. Si todo pasa → OK para commit
```

### Build
```bash
# Build para producción
npm run build

# Limpiar directorio de build
rm -rf dist && npm run build
```

### Operaciones Docker
```bash
# Construir imagen Docker
docker build -t tradingview-screenshot-service .

# Ejecutar contenedor localmente
docker run -p 3000:3000 --env-file .env tradingview-screenshot-service

# Docker Compose (para desarrollo con PostgreSQL)
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### Linting y Formato
```bash
# Lint del código
npm run lint

# Formatear código
npm run format
```

## Arquitectura y Estructura

### Módulo Principal: Screenshots
El corazón de la aplicación es el módulo `screenshots`, que maneja toda la lógica de captura de screenshots:

- **Controller** (`screenshots.controller.ts`): Expone los endpoints REST
- **Service** (`screenshots.service.ts`): Lógica de negocio para captura de screenshots
- **DTOs**: Validación y tipado de requests/responses
- **Entities**: Modelos de base de datos (si se usa PostgreSQL)

### Arquitectura de Helpers por Plataforma

Usar **patrón Factory** para manejar múltiples plataformas de forma escalable:

```
src/common/utils/
├── platform-factory.ts          # Factory que devuelve el helper correcto
├── tradingview.helper.ts        # Lógica específica de TradingView
├── investing.helper.ts          # Lógica específica de Investing.com
└── base-platform.interface.ts   # Interface común para todas las plataformas
```

**Interface Base:**
```typescript
interface IPlatformHelper {
  buildUrl(symbol: string, timeframe: string): string;
  getChartSelector(): string;
  getElementsToRemove(): string[];
  getWaitTimeout(): number;
  mapSymbol(symbol: string): string;
  mapTimeframe(timeframe: string): string;
}
```

Esto permite agregar nuevas plataformas en el futuro (ej: Yahoo Finance, Bloomberg) sin modificar código existente.

### Endpoints Críticos

#### POST /api/screenshots/batch (MÁS IMPORTANTE)
El endpoint principal para el flujo Make.com → Claude AI. Captura múltiples símbolos en múltiples timeframes en paralelo.

**Request Body:**
```typescript
{
  "symbols": ["XAUUSD", "EURUSD"],
  "timeframes": ["240", "60", "5"],
  "platform": "tradingview",  // "tradingview" o "investing" (default: tradingview)
  "width": 1920,
  "height": 1080,
  "includeBase64": true,
  "format": "png"
}
```

**Requisitos Clave:**
- Procesar screenshots en paralelo con límite de concurrencia (3-5 tabs máximo)
- Completar 3 screenshots (1 símbolo × 3 timeframes) en <15 segundos
- Soportar AMBAS plataformas: TradingView e Investing.com
- Soportar formatos de salida URL y base64
- Manejo robusto de errores con lógica de reintentos (máximo 3 intentos)
- Logging detallado para debugging de problemas del sistema de trading

**Flujo del Request:**
1. Validar request (símbolos, timeframes, dimensiones, plataforma)
2. Generar URLs según la plataforma seleccionada (TradingView o Investing.com)
3. Lanzar instancias de Puppeteer con control de concurrencia
4. Esperar renderizado del gráfico + limpiar elementos de UI específicos de la plataforma
5. Capturar screenshots
6. Almacenar localmente y/o subir a S3
7. Retornar URLs o datos en base64

**Response:**
```typescript
{
  "success": true,
  "data": {
    "totalImages": 6,
    "platform": "tradingview",
    "screenshots": [
      {
        "symbol": "XAUUSD",
        "timeframe": "4H",
        "platform": "tradingview",
        "imageUrl": "https://...",
        "base64": "data:image/png;base64,...",
        "metadata": {
          "capturedAt": "2025-11-12T10:30:00Z",
          "fileSize": "245KB",
          "dimensions": "1920x1080"
        }
      },
      // ... más screenshots
    ]
  }
}
```

#### POST /api/screenshots/single
Captura de screenshot individual para una combinación símbolo/timeframe.

**Request Body:**
```typescript
{
  "symbol": "XAUUSD",
  "timeframe": "240",
  "platform": "tradingview",  // opcional, default: tradingview
  "width": 1920,
  "height": 1080
}
```

### Detalles de Implementación de Puppeteer

El servicio debe soportar **DOS plataformas de gráficos**:
1. **TradingView** (www.tradingview.com)
2. **Investing.com** (www.investing.com)

#### Configuración para TradingView

**Construcción de URL:**
```
https://www.tradingview.com/chart/?symbol=OANDA:{SYMBOL}&interval={TIMEFRAME}
```

**Ejemplo:**
```
https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD&interval=240
```

**Mapeo de Timeframes:**
- `1` = 1 minuto
- `5` = 5 minutos
- `15` = 15 minutos
- `60` = 1 hora (1H)
- `240` = 4 horas (4H)
- `1D` = 1 día

**Condiciones de Espera:**
1. Esperar por selector: `.chart-container`
2. Esperar por red inactiva: `networkidle2`
3. Buffer adicional de 2 segundos para renderizado completo
4. Ejecutar JavaScript de limpieza para remover elementos de UI (toolbar, sidebar, popups)

**Selectores a Remover:**
```javascript
document.querySelector('.header-toolbar')?.remove();
document.querySelector('.left-toolbar')?.remove();
document.querySelector('.toast-container')?.remove();
```

#### Configuración para Investing.com

**Construcción de URL:**
```
https://www.investing.com/currencies/{symbol-slug}-chart
```

**Ejemplos:**
```
https://www.investing.com/currencies/xau-usd-chart
https://www.investing.com/currencies/eur-usd-chart
https://www.investing.com/currencies/gbp-usd-chart
```

**Mapeo de Símbolos a Slugs:**
```typescript
const investingSlugMap = {
  'XAUUSD': 'xau-usd',
  'EURUSD': 'eur-usd',
  'GBPUSD': 'gbp-usd',
  'USDJPY': 'usd-jpy',
  'AUDUSD': 'aud-usd',
  'USDCAD': 'usd-cad',
  // Agregar más según necesidad
};
```

**Mapeo de Timeframes:**
- `5` = 5 minutos
- `15` = 15 minutos
- `30` = 30 minutos
- `60` = 1 hora
- `300` = 5 horas (se usa "5H" en la interfaz)
- `1D` = 1 día

**Condiciones de Espera:**
1. Esperar por selector: `#chart` o `.chart-wrapper`
2. Esperar por red inactiva: `networkidle2`
3. Buffer adicional de 3 segundos (Investing.com suele ser más lento)
4. Cerrar popups/banners de cookies y publicidad

**Selectores a Remover:**
```javascript
document.querySelector('.adPlaceholder')?.remove();
document.querySelector('.banner')?.remove();
document.querySelector('.cookiePolicy')?.remove();
document.querySelector('.topBar')?.remove();
```

**Notas Importantes para Investing.com:**
- Investing.com tiene más publicidad que TradingView, requiere limpieza más agresiva
- Puede requerir cambiar el timeframe mediante clicks en la interfaz (usar `page.click()`)
- Considerar usar cookies guardadas para evitar banners repetitivos
- El renderizado puede ser más lento, ajustar timeouts en consecuencia

#### Comparación de Plataformas

| Característica | TradingView | Investing.com |
|---------------|-------------|---------------|
| **Velocidad de carga** | ⚡ Rápida (2-3s) | 🐢 Más lenta (3-5s) |
| **Publicidad** | ✅ Mínima | ⚠️ Abundante |
| **Estabilidad de selectores** | ✅ Alta | ⚠️ Media (cambian más) |
| **Calidad de gráficos** | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐ Muy buena |
| **URL directa a timeframe** | ✅ Sí | ❌ No, requiere clicks |
| **Mejor para** | Análisis técnico detallado | Vista alternativa, validación |

**Recomendación:** Usar TradingView como plataforma principal y Investing.com como respaldo o para comparación.

**Argumentos de Lanzamiento del Navegador (para Docker/Producción):**
```typescript
{
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ]
}
```

### Documentación Swagger (OBLIGATORIO)

**Configuración en main.ts:**
```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración Swagger (OBLIGATORIO)
  const config = new DocumentBuilder()
    .setTitle('TradingView & Investing.com Screenshot Service')
    .setDescription('API para captura automatizada de screenshots de gráficos financieros')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addTag('screenshots', 'Endpoints de captura de screenshots')
    .addTag('health', 'Health checks del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
```

**Acceso a Swagger UI:**
- Desarrollo: `http://localhost:3000/api/docs`
- Producción: `https://tu-dominio.com/api/docs`

**Decoradores Obligatorios en Todos los Endpoints:**
```typescript
@ApiTags('screenshots')
@Controller('screenshots')
export class ScreenshotsController {

  @Post('batch')
  @ApiOperation({
    summary: 'Captura múltiple de screenshots',
    description: 'Genera screenshots de múltiples símbolos en múltiples timeframes. Soporta TradingView e Investing.com'
  })
  @ApiBody({ type: BatchScreenshotDto })
  @ApiResponse({
    status: 200,
    description: 'Screenshots generados exitosamente',
    type: BatchScreenshotResponseDto
  })
  @ApiResponse({ status: 400, description: 'Request inválido' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
  @ApiResponse({ status: 500, description: 'Error del servidor' })
  @ApiSecurity('api-key')
  async batchCapture(@Body() dto: BatchScreenshotDto) {
    // Implementación
  }
}
```

**DTOs con Decoradores de Swagger:**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, IsIn } from 'class-validator';

export class BatchScreenshotDto {
  @ApiProperty({
    description: 'Array de símbolos a capturar',
    example: ['XAUUSD', 'EURUSD'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  symbols: string[];

  @ApiProperty({
    description: 'Array de timeframes en minutos',
    example: ['240', '60', '5'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  timeframes: string[];

  @ApiProperty({
    description: 'Plataforma de gráficos',
    example: 'tradingview',
    enum: ['tradingview', 'investing'],
    default: 'tradingview'
  })
  @IsOptional()
  @IsIn(['tradingview', 'investing'])
  platform?: string;

  @ApiProperty({
    description: 'Incluir imágenes en formato base64',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  includeBase64?: boolean;

  @ApiProperty({
    description: 'Ancho de la imagen en píxeles',
    example: 1920,
    default: 1920
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiProperty({
    description: 'Alto de la imagen en píxeles',
    example: 1080,
    default: 1080
  })
  @IsOptional()
  @IsNumber()
  height?: number;
}
```

### Seguridad y Autenticación

**API Key Guard:**
Todos los endpoints protegidos con `ApiKeyGuard` personalizado que valida el header `x-api-key` contra `process.env.API_KEY`.

**Variables de Entorno:**
```bash
# Requeridas
PORT=3000
NODE_ENV=production
API_KEY=tu_api_key_segura_aqui

# Ajuste de rendimiento
MAX_CONCURRENT_SCREENSHOTS=3
SCREENSHOT_TIMEOUT=30000
MAX_BATCH_SIZE=20

# Almacenamiento
STORAGE_TYPE=local  # o s3, cloudinary
STORAGE_PATH=./storage/screenshots

# Opcional: Base de Datos
DATABASE_URL=postgresql://user:pass@localhost:5432/screenshots

# Opcional: AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET=
```

### Optimización de Rendimiento

**Procesamiento Paralelo:**
- Usar `Promise.all()` con limitador de concurrencia para requests batch
- Limitar a 3-5 instancias de navegador simultáneas para prevenir agotamiento de recursos
- Considerar sistema de colas Bull/BullMQ para escenarios de alto volumen

**Estrategia de Caché:**
- Caché opcional de Redis para screenshots recientes (TTL de 5 minutos)
- Formato de clave de caché: `{symbol}:{timeframe}:{timestamp_floor}`

**Limpieza de Recursos:**
- Cron job para eliminar screenshots más antiguos de 24 horas
- Cerrar correctamente instancias de navegador incluso ante errores
- Monitorear uso de memoria e implementar circuit breakers

### Manejo de Errores

**Lógica de Reintentos:**
- Reintento automático hasta 3 veces ante fallos de screenshots
- Backoff exponencial entre reintentos (1s, 2s, 4s)
- Log de todos los intentos de reintento con timestamps

**Formato de Respuesta de Error:**
```typescript
{
  success: false,
  error: {
    code: 'SCREENSHOT_FAILED',
    message: 'Failed to capture XAUUSD 4H after 3 attempts',
    details: { symbol: 'XAUUSD', timeframe: '240', attempts: 3 }
  }
}
```

## Integración con Flujo de Make.com

**Flujo de Automatización Típico:**
1. Webhook/schedule de Make.com se activa cada hora durante sesión Londres/NY
2. HTTP Request a `/api/screenshots/batch` con:
   - `symbols: ["XAUUSD"]`
   - `timeframes: ["240", "60", "5"]` (4H, 1H, 5M)
   - `includeBase64: true` (para subida directa a Claude AI)
3. El servicio retorna 3 screenshots con metadata
4. Make.com envía imágenes a Claude AI vía API de Anthropic
5. Claude analiza usando Smart Money Concepts (Order Blocks, FVGs, liquidity sweeps)
6. Si 2+ timeframes muestran confluencia → Ejecutar trade en MT5

**SLA Crítico:**
- Tiempo de respuesta: <15 segundos para 3 screenshots
- Requerimiento de uptime: 99%+ (dependencia del sistema de trading)
- Implementar endpoint `/api/health` para monitoreo con UptimeRobot

## Mejores Prácticas del Flujo de Desarrollo

### Al Agregar Nuevas Funcionalidades

1. **Definir DTOs primero** - Asegurar type safety y validación con decoradores de class-validator
2. **⚠️ OBLIGATORIO: Documentación Swagger** - TODOS los endpoints deben tener decoradores Swagger completos (@ApiOperation, @ApiBody, @ApiResponse, @ApiTags)
3. **⚠️ OBLIGATORIO: Pruebas Unitarias** - CADA endpoint debe tener tests unitarios que validen:
   - Request válido retorna 200
   - Request inválido retorna 400
   - Sin API Key retorna 401
   - Errores internos retornan 500
   - Validación de DTOs
   - Mocks de Puppeteer funcionan correctamente
4. **⚠️ OBLIGATORIO: Ejecutar tests antes de considerar completo** - `npm run test` debe pasar al 100%
5. **Probar con URLs reales de ambas plataformas** - Verificar renderizado de gráficos en TradingView e Investing.com
6. **Monitorear rendimiento** - Log de tiempos de ejecución para cada paso

**Flujo de Desarrollo Obligatorio:**
```bash
1. Escribir DTO con validaciones
2. Escribir controller con Swagger
3. Escribir service con lógica
4. Escribir tests unitarios (.spec.ts)
5. Ejecutar: npm run test
6. Si tests pasan → Probar endpoint manualmente
7. Si todo funciona → Endpoint completo
```

### Pruebas de Integración con las Plataformas

```bash
# Probar screenshot individual en TradingView
curl -X POST http://localhost:3000/api/screenshots/single \
  -H "x-api-key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"XAUUSD","timeframe":"240","platform":"tradingview"}'

# Probar screenshot individual en Investing.com
curl -X POST http://localhost:3000/api/screenshots/single \
  -H "x-api-key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"XAUUSD","timeframe":"240","platform":"investing"}'

# Probar batch en TradingView (endpoint crítico)
curl -X POST http://localhost:3000/api/screenshots/batch \
  -H "x-api-key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["XAUUSD"],"timeframes":["240","60","5"],"platform":"tradingview","includeBase64":true}'

# Probar batch en Investing.com
curl -X POST http://localhost:3000/api/screenshots/batch \
  -H "x-api-key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["XAUUSD","EURUSD"],"timeframes":["240","60"],"platform":"investing","includeBase64":false}'
```

### Debugging de Problemas con Puppeteer

1. Configurar `headless: false` temporalmente para ver acciones del navegador
2. Agregar `page.screenshot()` en diferentes etapas para debug de renderizado
3. Verificar logs de consola: `page.on('console', msg => console.log(msg.text()))`
4. Verificar accesibilidad de URL de TradingView en navegador regular primero
5. Aumentar valores de timeout si la red es lenta

## Pruebas Unitarias (OBLIGATORIO)

### Estructura de Tests por Archivo

Cada archivo debe tener su correspondiente `.spec.ts`:
```
src/modules/screenshots/
├── screenshots.controller.ts
├── screenshots.controller.spec.ts  ← OBLIGATORIO
├── screenshots.service.ts
├── screenshots.service.spec.ts     ← OBLIGATORIO
└── dto/
    ├── batch-screenshot.dto.ts
    └── batch-screenshot.dto.spec.ts ← OBLIGATORIO
```

### Ejemplo: Test del Controller

```typescript
// screenshots.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ScreenshotsController } from './screenshots.controller';
import { ScreenshotsService } from './screenshots.service';
import { BatchScreenshotDto } from './dto/batch-screenshot.dto';

describe('ScreenshotsController', () => {
  let controller: ScreenshotsController;
  let service: ScreenshotsService;

  const mockScreenshotsService = {
    batchCapture: jest.fn(),
    singleCapture: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreenshotsController],
      providers: [
        {
          provide: ScreenshotsService,
          useValue: mockScreenshotsService,
        },
      ],
    }).compile();

    controller = module.get<ScreenshotsController>(ScreenshotsController);
    service = module.get<ScreenshotsService>(ScreenshotsService);
  });

  describe('POST /screenshots/batch', () => {
    it('debe retornar screenshots exitosamente con request válido', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240', '60'],
        platform: 'tradingview',
        includeBase64: false,
      };

      const expectedResult = {
        success: true,
        data: {
          totalImages: 2,
          platform: 'tradingview',
          screenshots: [
            {
              symbol: 'XAUUSD',
              timeframe: '4H',
              platform: 'tradingview',
              imageUrl: 'https://example.com/screenshot.png',
              metadata: { capturedAt: new Date().toISOString() },
            },
          ],
        },
      };

      mockScreenshotsService.batchCapture.mockResolvedValue(expectedResult);

      const result = await controller.batchCapture(dto);

      expect(result).toEqual(expectedResult);
      expect(mockScreenshotsService.batchCapture).toHaveBeenCalledWith(dto);
    });

    it('debe lanzar error con símbolos vacíos', async () => {
      const dto: BatchScreenshotDto = {
        symbols: [],
        timeframes: ['240'],
        platform: 'tradingview',
      };

      mockScreenshotsService.batchCapture.mockRejectedValue(
        new Error('Symbols array cannot be empty'),
      );

      await expect(controller.batchCapture(dto)).rejects.toThrow();
    });

    it('debe funcionar con plataforma investing.com', async () => {
      const dto: BatchScreenshotDto = {
        symbols: ['XAUUSD'],
        timeframes: ['240'],
        platform: 'investing',
      };

      const expectedResult = {
        success: true,
        data: { totalImages: 1, platform: 'investing', screenshots: [] },
      };

      mockScreenshotsService.batchCapture.mockResolvedValue(expectedResult);

      const result = await controller.batchCapture(dto);

      expect(result.data.platform).toBe('investing');
    });
  });
});
```

### Ejemplo: Test del Service

```typescript
// screenshots.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ScreenshotsService } from './screenshots.service';
import * as puppeteer from 'puppeteer';

// Mock de Puppeteer
jest.mock('puppeteer');

describe('ScreenshotsService', () => {
  let service: ScreenshotsService;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(async () => {
    // Setup de mocks
    mockPage = {
      goto: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn(),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
      evaluate: jest.fn(),
      close: jest.fn(),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ScreenshotsService],
    }).compile();

    service = module.get<ScreenshotsService>(ScreenshotsService);
  });

  describe('captureScreenshot', () => {
    it('debe capturar screenshot de TradingView exitosamente', async () => {
      const result = await service.captureScreenshot(
        'XAUUSD',
        '240',
        'tradingview',
      );

      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('tradingview.com'),
        expect.any(Object),
      );
      expect(mockPage.screenshot).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('debe capturar screenshot de Investing.com exitosamente', async () => {
      const result = await service.captureScreenshot(
        'XAUUSD',
        '240',
        'investing',
      );

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('investing.com'),
        expect.any(Object),
      );
      expect(result).toBeDefined();
    });

    it('debe manejar errores de timeout correctamente', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      await expect(
        service.captureScreenshot('XAUUSD', '240', 'tradingview'),
      ).rejects.toThrow();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('debe reintentar hasta 3 veces en caso de fallo', async () => {
      mockPage.screenshot
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(Buffer.from('success'));

      const result = await service.captureScreenshot(
        'XAUUSD',
        '240',
        'tradingview',
      );

      expect(mockPage.screenshot).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });
  });

  describe('batchCapture', () => {
    it('debe procesar múltiples screenshots en paralelo', async () => {
      const dto = {
        symbols: ['XAUUSD', 'EURUSD'],
        timeframes: ['240', '60'],
        platform: 'tradingview',
      };

      const result = await service.batchCapture(dto);

      expect(result.data.totalImages).toBe(4); // 2 symbols × 2 timeframes
      expect(result.success).toBe(true);
    });

    it('debe respetar límite de concurrencia', async () => {
      const dto = {
        symbols: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
        timeframes: ['240'],
        platform: 'tradingview',
      };

      const result = await service.batchCapture(dto);

      // Verificar que no se lancen más de MAX_CONCURRENT_SCREENSHOTS a la vez
      expect(result.data.totalImages).toBe(5);
    });
  });
});
```

### Ejemplo: Test de DTOs

```typescript
// batch-screenshot.dto.spec.ts
import { validate } from 'class-validator';
import { BatchScreenshotDto } from './batch-screenshot.dto';

describe('BatchScreenshotDto', () => {
  it('debe validar DTO correcto', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];
    dto.platform = 'tradingview';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe rechazar symbols vacío', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = [];
    dto.timeframes = ['240'];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe rechazar plataforma inválida', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];
    dto.platform = 'invalid-platform' as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe aceptar plataformas válidas', async () => {
    const platforms = ['tradingview', 'investing'];

    for (const platform of platforms) {
      const dto = new BatchScreenshotDto();
      dto.symbols = ['XAUUSD'];
      dto.timeframes = ['240'];
      dto.platform = platform as any;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });
});
```

### Cobertura Mínima Requerida

**Objetivo: >80% de cobertura en todos los módulos**

```bash
# Generar reporte de cobertura
npm run test:cov

# El reporte debe mostrar:
# Statements   : >80%
# Branches     : >80%
# Functions    : >80%
# Lines        : >80%
```

### Tests que DEBEN existir para cada endpoint:

1. ✅ **Happy path** - Request válido retorna respuesta esperada
2. ✅ **Validación de DTOs** - Requests inválidos son rechazados
3. ✅ **Autenticación** - Sin API Key retorna 401
4. ✅ **Manejo de errores** - Errores internos retornan 500
5. ✅ **Ambas plataformas** - Tests para TradingView e Investing.com
6. ✅ **Casos edge** - Arrays vacíos, valores null, timeouts
7. ✅ **Concurrencia** - Límite de screenshots paralelos
8. ✅ **Reintentos** - Lógica de retry funciona correctamente

## Convenciones Específicas del Proyecto

- **Comentarios en Español** - Todos los comentarios de código deben estar en español según requisitos del proyecto
- **Timeframes como strings** - Siempre usar formato string para timeframes ("240", "60", "5")
- **Formato de símbolo** - Para TradingView incluir prefijo de exchange: "OANDA:XAUUSD". Para Investing.com usar símbolo estándar: "XAUUSD"
- **Error logging** - Siempre incluir símbolo, timeframe, plataforma y timestamp en logs de error
- **Tiempos de respuesta** - Log de duración para cada operación de screenshot, separado por plataforma

## Casos de Uso por Plataforma

### Cuándo usar TradingView:
- ✅ Análisis técnico principal para decisiones de trading
- ✅ Cuando necesitas máxima velocidad de captura (<15s para 3 screenshots)
- ✅ Para aplicar indicadores técnicos personalizados
- ✅ Cuando necesitas estabilidad y consistencia en los gráficos
- ✅ Análisis con Smart Money Concepts (Order Blocks, FVGs, etc.)

### Cuándo usar Investing.com:
- ✅ Como fuente secundaria para validar análisis de TradingView
- ✅ Cuando TradingView está caído o con problemas
- ✅ Para obtener una perspectiva visual diferente del mismo timeframe
- ✅ Comparación de datos entre plataformas para detectar discrepancias
- ✅ Backup en caso de cambios en la estructura de TradingView

### Estrategia Recomendada para Make.com:
```javascript
// Workflow en Make.com:
1. Intentar captura con TradingView (plataforma principal)
2. Si falla después de 2 reintentos → cambiar a Investing.com
3. Si ambas fallan → enviar alerta al sistema de monitoreo
4. Claude AI puede analizar screenshots de ambas plataformas simultáneamente
```

## Notas de Deployment

### Build Docker para Producción

El Dockerfile debe instalar dependencias de Chromium para Alpine Linux:
```dockerfile
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Requerimientos de Recursos
- **Memoria:** Mínimo 512MB, recomendado 1GB para procesamiento paralelo
- **CPU:** 1 core mínimo, 2+ cores recomendado para operaciones batch
- **Almacenamiento:** 1GB para screenshots temporales (con job de limpieza)

### Health Checks
Implementar endpoint `/api/health` que verifique:
- La app NestJS está respondiendo
- Puppeteer puede lanzar el navegador exitosamente
- El directorio de almacenamiento tiene permisos de escritura
- Conexión a base de datos (si se usa PostgreSQL)

## Fases de Implementación

### Fase 1 (Producto Mínimo Viable)
- Estructura básica de NestJS con módulo/controller/service
- **Swagger configurado y funcionando en `/api/docs`**
- Endpoint `/api/screenshots/batch` completamente funcional **con Swagger y Tests**
- Endpoint `/api/screenshots/single` **con Swagger y Tests**
- Endpoint `/api/health` **con Swagger y Tests**
- **Pruebas unitarias completas para todos los endpoints (>80% cobertura)**
  - `screenshots.controller.spec.ts`
  - `screenshots.service.spec.ts`
  - `batch-screenshot.dto.spec.ts`
  - `single-screenshot.dto.spec.ts`
- Integración de Puppeteer con TradingView e Investing.com
- Guard de autenticación por API Key **con tests**
- Almacenamiento en archivos local
- Manejo básico de errores y logging
- **TODOS los DTOs con decoradores @ApiProperty**
- **`npm run test` pasa al 100%**

### Fase 2 (Listo para Producción)
- Endpoint `/api/screenshots/single`
- Procesamiento paralelo optimizado con control de concurrencia
- Manejo integral de errores con reintentos
- Logger Winston con logging estructurado
- Tests unitarios y E2E (>80% cobertura)
- Dockerfile y docker-compose.yml

### Fase 3 (Funcionalidades Mejoradas)
- Capa de caché con Redis
- Integración de almacenamiento S3/Cloudinary
- Sistema de colas Bull para alto volumen
- Dashboard de métricas (Prometheus/Grafana)
- Rate limiting y throttling de requests
- Endpoints de historial de screenshots

## Checklist de Verificación de Completitud de Endpoints

Antes de considerar un endpoint como "completo", verificar **TODOS** estos puntos:

### Swagger (OBLIGATORIO)
- [ ] Swagger UI accesible en `/api/docs`
- [ ] Endpoint tiene decorador `@ApiTags()`
- [ ] Endpoint tiene decorador `@ApiOperation()` con summary y description
- [ ] Endpoint tiene decorador `@ApiBody()` si recibe body
- [ ] Endpoint tiene todos los `@ApiResponse()` posibles (200, 400, 401, 500)
- [ ] Endpoint tiene `@ApiSecurity('api-key')` si está protegido
- [ ] DTO de request tiene `@ApiProperty()` en TODAS las propiedades
- [ ] DTO de response tiene `@ApiProperty()` en TODAS las propiedades
- [ ] Ejemplos (`example:`) definidos en cada `@ApiProperty()`
- [ ] Enums definidos para campos con valores limitados
- [ ] Se puede probar el endpoint directamente desde Swagger UI
- [ ] La documentación es clara y en español

### Pruebas Unitarias (OBLIGATORIO)
- [ ] Existe archivo `.spec.ts` para el controller
- [ ] Existe archivo `.spec.ts` para el service
- [ ] Existe archivo `.spec.ts` para cada DTO
- [ ] Test de happy path (request válido → 200 OK)
- [ ] Test de validación (request inválido → 400 Bad Request)
- [ ] Test de autenticación (sin API Key → 401 Unauthorized)
- [ ] Test de errores internos (error del servidor → 500)
- [ ] Tests para ambas plataformas (TradingView e Investing.com)
- [ ] Tests de casos edge (arrays vacíos, valores null, etc.)
- [ ] Tests de concurrencia y límites
- [ ] Tests de lógica de reintentos
- [ ] `npm run test` pasa al 100% sin errores
- [ ] Cobertura de código >80% (`npm run test:cov`)

### Funcionalidad
- [ ] El endpoint funciona correctamente con TradingView
- [ ] El endpoint funciona correctamente con Investing.com
- [ ] Manejo de errores implementado correctamente
- [ ] Logging detallado de operaciones
- [ ] Validación de DTOs con class-validator funciona
- [ ] API Key guard protege el endpoint correctamente

**⚠️ CRÍTICO:** Si un endpoint NO cumple con TODOS estos puntos, NO está terminado y NO se debe considerar completo.

## Archivos Clave para Referencia

- `CONTEXTO` - Requisitos completos del proyecto y especificaciones en español
- `.env.example` - Plantilla para variables de entorno requeridas
- `src/main.ts` - **Configuración de Swagger (OBLIGATORIO)**
- `src/modules/screenshots/screenshots.controller.ts` - **Todos los endpoints deben tener decoradores Swagger**
- `src/modules/screenshots/screenshots.service.ts` - Lógica de negocio principal para captura de screenshots
- `src/modules/screenshots/dto/*.dto.ts` - **Todos los DTOs deben tener @ApiProperty en cada campo**
- `src/common/utils/tradingview.helper.ts` - Construcción de URLs de TradingView y mapeo de timeframes
- `src/common/utils/investing.helper.ts` - Construcción de URLs de Investing.com y mapeo de símbolos/timeframes
- `src/common/utils/platform-factory.ts` - Factory pattern para seleccionar la plataforma correcta (TradingView/Investing)
- `docker/Dockerfile` - Configuración de contenedor de producción
