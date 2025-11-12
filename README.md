# 📸 Screenshot Service - TradingView & Investing.com

Servicio backend para captura automatizada de screenshots de gráficos financieros desde **TradingView** e **Investing.com**. Diseñado para integrarse con Make.com y Claude AI para análisis técnico multi-timeframe usando Smart Money Concepts.

## 🚀 Características

- ✅ **Multi-Plataforma**: Soporte para TradingView e Investing.com
- ✅ **Swagger/OpenAPI**: Documentación completa en `/api/docs`
- ✅ **Captura Paralela**: Procesamiento concurrente con límite configurable
- ✅ **Reintentos Automáticos**: Hasta 3 intentos con backoff exponencial
- ✅ **API Key Protection Robusto**: Sistema de autenticación con base de datos PostgreSQL
- ✅ **Gestión de API Keys**: Crear, listar, revocar y eliminar keys vía API
- ✅ **Keys Hasheadas**: Almacenamiento seguro con bcrypt (nunca se guarda la key completa)
- ✅ **Rate Limiting por Key**: Control de tasa configurable por cada API Key
- ✅ **Expiración de Keys**: Soporte para keys con fecha de vencimiento
- ✅ **Base64 Opcional**: Soporte para incluir imágenes en base64
- ✅ **Tests Unitarios**: 42 tests pasando al 100%
- ✅ **TypeScript**: Type-safe en todo el proyecto
- ✅ **Logging Detallado**: Logs de todas las operaciones
- ✅ **Railway Ready**: Configurado para despliegue en Railway con PostgreSQL

## 📋 Requisitos

- Node.js >= 18
- npm >= 9
- PostgreSQL >= 12 (requerido para sistema de API Keys)
- Chromium (instalado automáticamente por Puppeteer)

## 🔧 Instalación

```bash
# Clonar repositorio
git clone https://github.com/jose890823/screenshootfx_backend.git
cd screenshootfx_backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env y configurar tu API_KEY
```

## ⚙️ Configuración

### Variables de Entorno (.env)

```bash
# Aplicación
PORT=3000
NODE_ENV=development

# Seguridad - MASTER_KEY para gestión de API Keys (NO para uso regular)
MASTER_KEY=tu_master_key_ultra_segura_cambiar_en_produccion

# Base de Datos PostgreSQL (REQUERIDO)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=screenshoot_fx

# Puppeteer
MAX_CONCURRENT_SCREENSHOTS=3
SCREENSHOT_TIMEOUT=30000
MAX_BATCH_SIZE=20

# Almacenamiento
STORAGE_TYPE=local
STORAGE_PATH=./storage/screenshots
```

**IMPORTANTE**:
- `MASTER_KEY` es para administración del sistema de API Keys (crear/eliminar keys)
- Las API Keys para uso regular se generan vía endpoint `/api-keys` usando la MASTER_KEY
- Railway proporciona automáticamente las variables de base de datos en producción

## 🏃 Ejecución

```bash
# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod

# Debug
npm run start:debug
```

La aplicación estará disponible en:
- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

## 📡 Endpoints

### POST /screenshots/batch

Captura múltiple de screenshots (endpoint principal).

**Request:**
```json
{
  "symbols": ["XAUUSD", "EURUSD"],
  "timeframes": ["240", "60", "5"],
  "platform": "tradingview",
  "includeBase64": false,
  "width": 1920,
  "height": 1080,
  "format": "png"
}
```

**Headers:**
```
x-api-key: tu_api_key
Content-Type: application/json
```

### POST /screenshots/single

Captura individual de screenshot.

**Request:**
```json
{
  "symbol": "XAUUSD",
  "timeframe": "240",
  "platform": "tradingview",
  "width": 1920,
  "height": 1080,
  "format": "png"
}
```

### GET /health

Health check del servicio.

## 🔐 Sistema de API Keys

Este servicio utiliza un sistema robusto de gestión de API Keys con base de datos PostgreSQL.

### Arquitectura de Seguridad

- **Master Key**: Para administración del sistema (crear/eliminar keys)
- **API Keys**: Para uso regular de la API (captura de screenshots)
- Las keys se almacenan hasheadas con bcrypt (sal de 10 rounds)
- Cada key tiene formato: `sk_live_[60_caracteres_hexadecimales]`
- Solo se muestra la key completa UNA VEZ al crearla

### Gestión de API Keys

#### 1. Crear Nueva API Key

**Endpoint**: `POST /api-keys`
**Auth**: Requiere header `x-master-key` con tu MASTER_KEY

```bash
curl -X POST http://localhost:3000/api-keys \
  -H "x-master-key: tu_master_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Make.com Production",
    "rateLimit": 100,
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Make.com Production",
  "key": "sk_live_abc123...",  // ⚠️ Solo se muestra aquí
  "keyPrefix": "sk_live_",
  "isActive": true,
  "rateLimit": 100,
  "createdAt": "2025-01-15T10:30:00Z",
  "usageCount": 0
}
```

#### 2. Listar API Keys

```bash
curl http://localhost:3000/api-keys \
  -H "x-master-key: tu_master_key"
```

#### 3. Revocar API Key (Soft Delete)

```bash
curl -X POST http://localhost:3000/api-keys/{id}/revoke \
  -H "x-master-key: tu_master_key"
```

#### 4. Eliminar API Key Permanentemente

```bash
curl -X DELETE http://localhost:3000/api-keys/{id} \
  -H "x-master-key: tu_master_key"
```

#### 5. Limpiar Keys Expiradas

```bash
curl -X POST http://localhost:3000/api-keys/cleanup \
  -H "x-master-key: tu_master_key"
```

### Uso de API Keys

Una vez creada tu API Key, úsala en todos los endpoints de screenshots:

```bash
curl -X POST http://localhost:3000/screenshots/batch \
  -H "x-api-key: sk_live_tu_key_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["XAUUSD"],
    "timeframes": ["240"]
  }'
```

### Seguridad

- ✅ Keys hasheadas con bcrypt (nunca se almacena el texto plano)
- ✅ Rate limiting configurable por key
- ✅ Soporte para expiración automática
- ✅ Tracking de uso (lastUsedAt, usageCount)
- ✅ Revocación inmediata de keys comprometidas
- ✅ Master Key separada para administración

## 🧪 Tests

```bash
# Ejecutar todos los tests
npm run test

# Tests con cobertura
npm run test:cov

# Tests en modo watch
npm run test:watch

# Tests específicos
npm test -- dto  # Solo tests de DTOs
```

**Cobertura Actual: 42 tests pasando al 100%**

Incluye tests para:
- DTOs de Screenshots (19 tests)
- API Key Guard (4 tests)
- API Keys Service (17 tests)
- App Controller (1 test)
- Master Key Guard (1 test)

## 📖 Documentación Swagger

Accede a `http://localhost:3000/api/docs` para ver:
- Documentación completa de endpoints
- Schemas de requests/responses
- Probador interactivo de API
- Ejemplos de uso

## 🏗️ Arquitectura

```
src/
├── common/
│   ├── guards/
│   │   └── api-key.guard.ts       # Autenticación por API Key
│   ├── interfaces/
│   │   └── platform.interface.ts  # Interface para plataformas
│   └── utils/
│       ├── tradingview.helper.ts  # Helper TradingView
│       ├── investing.helper.ts    # Helper Investing.com
│       └── platform.factory.ts    # Factory de plataformas
├── modules/
│   └── screenshots/
│       ├── dto/                   # DTOs con validaciones
│       ├── screenshots.controller.ts
│       ├── screenshots.service.ts
│       └── screenshots.module.ts
└── main.ts                        # Configuración Swagger
```

## 🔐 Seguridad

- Todos los endpoints protegidos con API Key (validación contra BD)
- Sistema robusto de gestión de API Keys con PostgreSQL
- Keys hasheadas con bcrypt (nunca almacenadas en texto plano)
- Master Key separada para administración
- Validación estricta de inputs con class-validator
- Rate limiting configurable por API Key
- Soporte para expiración automática de keys
- Tracking de uso por key (lastUsedAt, usageCount)
- CORS habilitado para desarrollo

## 🌐 Plataformas Soportadas

### TradingView
- ⚡ Rápida (2-3s por screenshot)
- ✅ Mínima publicidad
- ✅ Alta estabilidad
- ✅ Mejor para análisis técnico detallado

### Investing.com
- 🐢 Más lenta (3-5s por screenshot)
- ⚠️ Más publicidad
- ✅ Vista alternativa
- ✅ Útil como backup

## 🛠️ Desarrollo

```bash
# Lint
npm run lint

# Format
npm run format

# Build
npm run build
```

## 📝 Notas

- Los screenshots se guardan en `./storage/screenshots/`
- Formato de nombre: `{symbol}_{timeframe}_{timestamp}.{format}`
- El servicio limpia automáticamente archivos antiguos (configurable)
- Soporte para timeframes: 1M, 5M, 15M, 30M, 1H, 4H, 1D

## 🤝 Integración con Make.com

Este servicio está diseñado para integrarse perfectamente con Make.com:

1. **Trigger** en Make.com (schedule/webhook)
2. **HTTP Request** a `/screenshots/batch`
3. **Recibir** URLs de screenshots
4. **Enviar** a Claude AI para análisis
5. **Ejecutar** trade si hay confluencia

## 📄 Documentación Adicional

- `CLAUDE.md`: Guía completa para Claude Code (1086 líneas)
- `CONTEXTO`: Especificaciones del proyecto en español
- `.env.example`: Template de variables de entorno

## 🐛 Troubleshooting

### Error: Puppeteer no puede lanzar Chromium

```bash
# Linux
sudo apt-get install -y chromium-browser

# macOS
brew install chromium

# Docker: Ver Dockerfile para dependencias
```

### Error: API Key inválida

Verifica que el header `x-api-key` coincida con `API_KEY` en tu `.env`.

## 📜 Licencia

MIT

## 👤 Autor

**Jose**
- GitHub: [@jose890823](https://github.com/jose890823)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
