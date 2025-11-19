# 🚂 Configuración de Variables de Entorno en Railway

## ⚠️ IMPORTANTE: Railway NO usa el archivo `.env`

El archivo `.env` en la raíz del proyecto es **SOLO para desarrollo local**.

**En Railway, las variables de entorno se configuran en la interfaz web.**

---

## 📋 Paso a Paso para Configurar Variables en Railway

### 1. Accede a tu Proyecto en Railway

1. Ve a [https://railway.app](https://railway.app)
2. Inicia sesión
3. Selecciona tu proyecto `screeeshootfx`
4. Haz clic en el servicio (el contenedor que está ejecutando tu app)

### 2. Ve a la Pestaña "Variables"

En la interfaz del servicio, verás varias pestañas:
- Deployments
- **Variables** ← Aquí
- Settings
- Metrics
- Logs

### 3. Agrega las Variables de Entorno Requeridas

Haz clic en **"New Variable"** y agrega cada una de estas variables **exactamente como aparecen** (los nombres deben ser idénticos):

#### Variables CRÍTICAS (OBLIGATORIAS):

```bash
# Seguridad
MASTER_KEY=my-super-secret-master-key-2025

# Base de Datos PostgreSQL
DB_HOST=postgres-production-a9ef.up.railway.app
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=screenshoot_fx

# Configuración Básica
NODE_ENV=production
PORT=3000
```

#### Variables Opcionales (con valores por defecto):

```bash
# Puppeteer (opcional - ya tienen defaults)
MAX_CONCURRENT_SCREENSHOTS=3
SCREENSHOT_TIMEOUT=30000
MAX_BATCH_SIZE=20

# Storage (opcional - ya tienen defaults)
STORAGE_TYPE=local
STORAGE_PATH=./storage/screenshots
```

---

## 🔍 Cómo Verificar que las Variables se Cargaron Correctamente

### Opción 1: Ver los Logs de Despliegue

1. En Railway, ve a la pestaña **"Deployments"**
2. Selecciona el último despliegue
3. Haz clic en **"View Logs"**
4. Busca esta sección al inicio:

```
=================================================
📋 VERIFICACIÓN DE VARIABLES DE ENTORNO
=================================================

🔧 CONFIGURACIÓN BÁSICA:
  PORT: 3000 ✅
  NODE_ENV: production ✅

🔐 SEGURIDAD:
  MASTER_KEY: my-s...2025 ✅

🗄️  BASE DE DATOS:
  DB_HOST: postgres-production-a9ef.up.railway.app ✅
  DB_PORT: 5432 ✅
  DB_USERNAME: postgres ✅
  DB_PASSWORD: **** ✅
  DB_DATABASE: screenshoot_fx ✅
```

**Si ves puros ✅ = Todo está bien configurado**
**Si ves ❌ = Esa variable falta o está mal escrita**

### Opción 2: Usar el Health Check Endpoint

Una vez que la aplicación esté corriendo, puedes hacer un request a:

```bash
GET https://tu-app.railway.app/api/health
```

**Respuesta exitosa:**
```json
{
  "status": "ok",
  "checks": {
    "environment": {
      "status": "up",
      "message": "All critical environment variables are configured",
      "metadata": {
        "configuredVars": {
          "masterKey": "✅",
          "dbHost": "✅",
          ...
        }
      }
    }
  }
}
```

**Si `environment.status` = "down"**, revisa `metadata.missingVars` para ver qué falta.

---

## 🐛 Solución de Problemas Comunes

### Error: "VALIDACIÓN DE VARIABLES DE ENTORNO FALLIDA"

**Causa:** Railway no encontró una o más variables críticas.

**Solución:**

1. **Verifica los nombres exactos** - Railway es sensible a mayúsculas/minúsculas
   - ✅ Correcto: `MASTER_KEY`
   - ❌ Incorrecto: `Master_Key`, `masterkey`, `MASTERKEY`

2. **Revisa que no haya espacios** en los nombres o valores
   - ✅ Correcto: `DB_HOST=postgres-production.railway.app`
   - ❌ Incorrecto: `DB_HOST = postgres-production.railway.app` (espacios alrededor del =)

3. **Verifica que no haya comillas** en los valores
   - ✅ Correcto: `MASTER_KEY=mi-clave-secreta`
   - ❌ Incorrecto: `MASTER_KEY="mi-clave-secreta"` (comillas innecesarias)

4. **Después de agregar/editar variables**, Railway reinicia automáticamente el servicio
   - Espera 30-60 segundos y revisa los nuevos logs

### Error: "Database connection failed"

**Causa:** Las credenciales de PostgreSQL son incorrectas o el host no es accesible.

**Solución:**

1. Si estás usando **Railway PostgreSQL**:
   - Ve a tu servicio de PostgreSQL en Railway
   - Ve a la pestaña "Variables"
   - Copia los valores de las variables de Railway PostgreSQL:
     - `PGHOST` → cópialo a `DB_HOST`
     - `PGPORT` → cópialo a `DB_PORT`
     - `PGUSER` → cópialo a `DB_USERNAME`
     - `PGPASSWORD` → cópialo a `DB_PASSWORD`
     - `PGDATABASE` → cópialo a `DB_DATABASE`

2. **Alternativamente**, puedes usar la variable `DATABASE_URL` directamente si Railway la provee.

### La aplicación se reinicia constantemente

**Causa:** Falta alguna variable crítica y la validación hace que la app crashee.

**Solución:**

1. Ve a los logs más recientes
2. Busca el mensaje: `❌ VALIDACIÓN DE VARIABLES DE ENTORNO FALLIDA:`
3. Agrega las variables que aparecen en el error
4. Railway reiniciará automáticamente

---

## 📝 Checklist Final

Antes de desplegar, asegúrate de tener:

- [ ] `MASTER_KEY` configurado
- [ ] `DB_HOST` configurado
- [ ] `DB_PORT` configurado (normalmente `5432`)
- [ ] `DB_USERNAME` configurado
- [ ] `DB_PASSWORD` configurado
- [ ] `DB_DATABASE` configurado
- [ ] `NODE_ENV` configurado como `production`
- [ ] `PORT` configurado (Railway asigna automáticamente, pero puedes usar `3000`)

---

## 🎯 Variables de Entorno en Railway vs Local

| Entorno | Cómo se configuran las variables |
|---------|----------------------------------|
| **Local (desarrollo)** | Archivo `.env` en la raíz del proyecto |
| **Railway (producción)** | Interfaz web de Railway → pestaña "Variables" |
| **Otro hosting (Heroku, Vercel, etc.)** | Interfaz web del proveedor |

**NUNCA** hagas commit del archivo `.env` con credenciales reales a GitHub. Ya está en `.gitignore` para evitar esto.

---

## 🔗 Links Útiles

- [Documentación de Railway sobre Variables de Entorno](https://docs.railway.app/develop/variables)
- [Dashboard de Railway](https://railway.app/dashboard)

---

## 💡 Tip: Usar Railway CLI (Opcional)

Puedes configurar variables desde la terminal con Railway CLI:

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Configurar variables
railway variables set MASTER_KEY=tu-valor-aqui
railway variables set DB_HOST=tu-host-aqui

# Ver todas las variables
railway variables
```

Esto es útil para scripts de CI/CD o para configurar múltiples variables rápidamente.
