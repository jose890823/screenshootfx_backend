# 📸 Screenshot Service - TradingView & Investing.com

Servicio backend para captura automatizada de screenshots de gráficos financieros desde **TradingView** e **Investing.com**. Diseñado para integrarse con Make.com y Claude AI para análisis técnico multi-timeframe usando Smart Money Concepts.

## 🚀 Características

- ✅ **Multi-Plataforma**: Soporte para TradingView e Investing.com
- ✅ **Swagger/OpenAPI**: Documentación completa en `/api/docs`
- ✅ **Captura Paralela**: Procesamiento concurrente con límite configurable
- ✅ **Reintentos Automáticos**: Hasta 3 intentos con backoff exponencial
- ✅ **API Key Protection**: Seguridad mediante header `x-api-key`
- ✅ **Base64 Opcional**: Soporte para incluir imágenes en base64
- ✅ **Tests Unitarios**: 19 tests pasando al 100%
- ✅ **TypeScript**: Type-safe en todo el proyecto
- ✅ **Logging Detallado**: Logs de todas las operaciones

## 📋 Requisitos

- Node.js >= 18
- npm >= 9
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
PORT=3000
NODE_ENV=development
API_KEY=tu_api_key_segura_aqui

MAX_CONCURRENT_SCREENSHOTS=3
SCREENSHOT_TIMEOUT=30000
MAX_BATCH_SIZE=20

STORAGE_TYPE=local
STORAGE_PATH=./storage/screenshots
```

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

**Cobertura Actual: 19 tests pasando al 100%**

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

- Todos los endpoints protegidos con API Key
- Validación estricta de inputs con class-validator
- Rate limiting configurable (próximamente)
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
