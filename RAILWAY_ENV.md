# Variables de Entorno para Railway

## ⚠️ IMPORTANTE: Configurar estas variables en Railway ANTES del deployment

### Variables OBLIGATORIAS

```bash
# Puerto (Railway lo asigna automáticamente, pero define el default)
PORT=3000

# Entorno de producción
NODE_ENV=production

# Master Key para gestión de API Keys (CAMBIAR POR UNA SEGURA)
MASTER_KEY=tu_master_key_ultra_segura_cambiar_en_produccion_railway

# Base de Datos PostgreSQL
# Railway puede proveer estas automáticamente si agregas un servicio PostgreSQL
DB_HOST=${PGHOST}
DB_PORT=${PGPORT}
DB_USERNAME=${PGUSER}
DB_PASSWORD=${PGPASSWORD}
DB_DATABASE=${PGDATABASE}

# Configuración de Puppeteer
MAX_CONCURRENT_SCREENSHOTS=3
SCREENSHOT_TIMEOUT=30000
MAX_BATCH_SIZE=20

# Almacenamiento (en Railway usar local, aunque con saveToStorage=false no se usa)
STORAGE_TYPE=local
STORAGE_PATH=/app/storage/screenshots
```

---

## 📋 Pasos para configurar en Railway

### 1. Crear proyecto en Railway
- Ir a https://railway.app
- Click en "New Project"
- Seleccionar "Deploy from GitHub repo"
- Conectar tu repositorio `screenshootfx_backend`

### 2. Agregar servicio PostgreSQL
- En tu proyecto Railway, click en "+ New"
- Seleccionar "Database" → "Add PostgreSQL"
- Railway automáticamente creará las variables: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### 3. Configurar variables de entorno del servicio NestJS
En la pestaña "Variables" de tu servicio NestJS, agregar:

```
NODE_ENV=production
PORT=3000
MASTER_KEY=<GENERAR_UNA_KEY_SEGURA_AQUI>
MAX_CONCURRENT_SCREENSHOTS=3
SCREENSHOT_TIMEOUT=30000
MAX_BATCH_SIZE=20
STORAGE_TYPE=local
STORAGE_PATH=/app/storage/screenshots
```

**⚠️ Railway ya provee automáticamente:**
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (si agregaste PostgreSQL)
- Solo necesitas copiar sus valores a `DB_HOST`, `DB_PORT`, etc. O mejor aún, modificar el código para usar las variables PG* directamente.

### 4. Configurar Health Check (Opcional pero recomendado)
- En "Settings" → "Health Check"
- Path: `/api/health`
- Timeout: 60 segundos

### 5. Deploy
- Railway detectará el `Dockerfile` automáticamente
- El build tomará ~5-10 minutos (instalación de Chromium)
- Una vez desplegado, Railway te dará una URL pública

---

## 🔐 Generar MASTER_KEY Segura

Puedes generar una key segura con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Probar el deployment

Una vez desplegado, prueba:

```bash
# Health Check
curl https://tu-app.railway.app/api/health

# Swagger UI
https://tu-app.railway.app/api/docs

# Crear primera API Key (usar MASTER_KEY)
curl -X POST https://tu-app.railway.app/api/api-keys \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_MASTER_KEY" \
  -d '{"name": "Make.com Production", "description": "API Key para Make.com"}'

# Probar screenshot (usar API Key generada)
curl -X POST https://tu-app.railway.app/api/screenshots/single \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY_GENERADA" \
  -d '{
    "symbol": "XAUUSD",
    "timeframe": "240",
    "platform": "tradingview",
    "includeBase64": true,
    "saveToStorage": false
  }'
```

---

## 📊 Monitoreo

Railway provee:
- Logs en tiempo real
- Métricas de CPU/RAM
- Alertas de uptime

También puedes agregar UptimeRobot para monitorear el endpoint `/api/health`

---

## 💰 Costos estimados en Railway

Con el plan Hobby ($5/mes):
- 500 horas de ejecución/mes
- 512MB RAM (suficiente para 3 screenshots concurrentes)
- PostgreSQL incluido

Para mayor rendimiento (más screenshots concurrentes), considera escalar a 1GB RAM.

---

## 🔄 Re-deployments automáticos

Railway hace re-deploy automático cuando:
- Haces push a la rama `main` en GitHub
- Actualizas variables de entorno (reinicia el servicio)

---

## ⚡ Optimizaciones para producción

1. **Usa saveToStorage=false** siempre en producción (ya configurado por default)
2. **Limita MAX_CONCURRENT_SCREENSHOTS** a 3-5 según RAM disponible
3. **Configura SCREENSHOT_TIMEOUT** apropiadamente (30s es seguro)
4. **Monitorea logs** para detectar errores de Puppeteer
