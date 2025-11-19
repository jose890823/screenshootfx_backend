# 🚂 Guía de Deployment en Railway - NestJS + PostgreSQL + Puppeteer

> **IMPORTANTE:** Guarda este archivo para futuros proyectos. Contiene TODAS las lecciones aprendidas de este deployment.

---

## 📋 Checklist de Deployment (Sigue este orden)

### ✅ Paso 1: Preparar el Código

#### 1.1 Configurar `main.ts` correctamente

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración básica
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS
  app.enableCors();

  // Swagger (opcional)
  const config = new DocumentBuilder()
    .setTitle('Tu API')
    .setDescription('Descripción')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ⚠️ CRÍTICO: Escuchar en 0.0.0.0, NO en localhost
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');  // ← ESTO ES OBLIGATORIO PARA RAILWAY

  console.log(`Application running on port ${port}`);
}
bootstrap();
```

**❌ ERROR COMÚN:**
```typescript
await app.listen(port); // ← NO FUNCIONA EN RAILWAY (escucha solo en localhost)
```

**✅ CORRECTO:**
```typescript
await app.listen(port, '0.0.0.0'); // ← FUNCIONA EN RAILWAY (escucha en todas las interfaces)
```

---

#### 1.2 Configurar conexión a PostgreSQL

```typescript
// src/app.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Railway provee estas variables automáticamente
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432', 10),
      username: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false, // Railway requiere SSL en producción
    }),
  ],
})
export class AppModule {}
```

---

### ✅ Paso 2: Crear archivos de configuración

#### 2.1 Dockerfile (Si usas Puppeteer)

```dockerfile
# Dockerfile
FROM node:20-slim

# ⚠️ CRÍTICO: Instalar Chromium para Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    libxtst6 \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configurar Puppeteer para usar Chromium del sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copiar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código y compilar
COPY . .
RUN npm run build

# Crear directorios necesarios
RUN mkdir -p /app/storage/screenshots

# Exponer puerto
EXPOSE 3000

# Usuario no-root (seguridad)
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Comando de inicio
CMD ["node", "dist/main.js"]
```

---

#### 2.2 railway.toml

```toml
# railway.toml
[build]
builder = "DOCKERFILE"  # ⚠️ CRÍTICO: Usar Docker, NO Nixpacks
dockerfilePath = "Dockerfile"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**⚠️ IMPORTANTE:** Sin este archivo, Railway usará Nixpacks que **NO instala Chromium**.

---

#### 2.3 .env.example

```bash
# .env.example
# Variables de Railway PostgreSQL (se configuran en Railway UI)
PGHOST=postgres.railway.internal
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password_here
PGDATABASE=railway

# Configuración de la aplicación
NODE_ENV=production
PORT=3000

# Seguridad
MASTER_KEY=your_master_key_here

# Puppeteer (opcional)
MAX_CONCURRENT_SCREENSHOTS=3
SCREENSHOT_TIMEOUT=30000
MAX_BATCH_SIZE=20

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage/screenshots
```

---

### ✅ Paso 3: Configurar en Railway (Interfaz Web)

#### 3.1 Crear los servicios

1. Ve a https://railway.app
2. Crea un nuevo proyecto
3. Agrega **PostgreSQL**:
   - Click en "New" → "Database" → "Add PostgreSQL"
   - Railway genera automáticamente las credenciales
4. Agrega tu **Backend**:
   - Click en "New" → "GitHub Repo"
   - Selecciona tu repositorio

---

#### 3.2 Vincular variables de PostgreSQL al Backend

**🔴 PASO MÁS IMPORTANTE - NO LO OLVIDES**

En Railway Web:

1. Click en tu servicio **Backend**
2. Ve a pestaña **"Variables"**
3. Click en **"+ New Variable"** → **"Add Reference"** (o ícono de cadena)
4. Selecciona servicio **"Postgres"**
5. Vincula estas variables:

| Variable en Backend | Valor del Servicio Postgres |
|---------------------|------------------------------|
| `PGHOST` | `Postgres.RAILWAY_PRIVATE_DOMAIN` |
| `PGPORT` | `5432` (manual) |
| `PGUSER` | `Postgres.POSTGRES_USER` |
| `PGPASSWORD` | `Postgres.POSTGRES_PASSWORD` |
| `PGDATABASE` | `Postgres.POSTGRES_DB` |

6. Agrega variables adicionales manualmente:

```bash
NODE_ENV=production
MASTER_KEY=tu_master_key_segura_aqui
```

---

#### 3.3 Verificar configuración de red

1. En tu servicio Backend → Pestaña **"Settings"**
2. Sección **"Networking"** → **"Public Networking"**
3. Asegúrate de que **"Generate Domain"** esté habilitado
4. Deberías ver un dominio como: `tu-backend.up.railway.app`

---

### ✅ Paso 4: Deploy

```bash
# En tu terminal local
git add .
git commit -m "Configure Railway deployment"
git push
```

Railway detecta el push automáticamente y hace deploy.

---

## 🔧 Comandos Útiles de Railway CLI

### Instalar Railway CLI

```bash
npm i -g @railway/cli
```

### Comandos básicos

```bash
# Login
railway login

# Vincular proyecto (necesitas el ID del proyecto)
railway link --project TU_PROJECT_ID

# Seleccionar servicio
railway service TU_SERVICIO

# Ver variables configuradas
railway variables

# Configurar una variable
railway variables --set "KEY=value"

# Ver logs en tiempo real
railway logs

# Ver status del proyecto
railway status

# Abrir dashboard en el navegador
railway open
```

---

## 🔍 Troubleshooting - Problemas Comunes

### ❌ Error: "502 Bad Gateway"

**Síntomas:**
- El endpoint público da error 502
- En logs: `Application failed to respond`

**Causas posibles:**

1. **App escucha en localhost en lugar de 0.0.0.0**
   ```typescript
   // ❌ MAL
   await app.listen(port);

   // ✅ BIEN
   await app.listen(port, '0.0.0.0');
   ```

2. **Railway usa Nixpacks en lugar de Docker**
   - Verifica que tengas `railway.toml` con `builder = "DOCKERFILE"`
   - En Railway UI → Deployments → Ve el log de build
   - Debería decir "Using Dockerfile", no "Using Nixpacks"

3. **El deployment aún está en proceso**
   - Espera 3-5 minutos para deployments con Docker
   - Verifica en Railway UI → Deployments → Estado debe ser "Active"

---

### ❌ Error: "ECONNREFUSED" al conectar a PostgreSQL

**Síntomas:**
```
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1122:18)
```

**Causas posibles:**

1. **Variables PG* NO están configuradas**
   - Ve a Railway UI → Backend → Variables
   - Verifica que PGHOST, PGUSER, PGPASSWORD, PGDATABASE existan
   - Si no existen, vincúlalas desde el servicio Postgres

2. **Usas el dominio público en lugar del privado**
   ```bash
   # ❌ MAL (para conexión interna)
   PGHOST=gondola.proxy.rlwy.net:58606

   # ✅ BIEN (para conexión interna en Railway)
   PGHOST=postgres.railway.internal
   ```

3. **Variables DB_* en lugar de PG***
   - Railway usa variables PG*, no DB_*
   - Elimina: DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE
   - Usa: PGHOST, PGUSER, PGPASSWORD, PGDATABASE

---

### ❌ Error: Puppeteer no puede lanzar Chromium

**Síntomas:**
```
Error: Failed to launch the browser process
Could not find Chrome
```

**Causa:**
Railway está usando Nixpacks que NO instala Chromium.

**Solución:**
1. Verifica que tengas `Dockerfile` con instalación de Chromium
2. Verifica que `railway.toml` tenga `builder = "DOCKERFILE"`
3. Redeploy el proyecto

---

### ❌ Error: "database does not exist"

**Síntomas:**
```
error: database "tu_base" does not exist
```

**Causa:**
El nombre de la base de datos en Railway es `railway`, no el que usas localmente.

**Solución:**
```bash
# En Railway, la base de datos se llama "railway" por defecto
PGDATABASE=railway  # ← Usa este valor
```

---

## 🌐 Conectarse a PostgreSQL desde tu Máquina Local

Railway provee **dos formas** de conexión:

### 1. Conexión Privada (Solo dentro de Railway)

```bash
Host: postgres.railway.internal
Port: 5432
User: postgres
Password: (el que genera Railway)
Database: railway
```

**Uso:** Para que tu Backend en Railway se conecte a PostgreSQL.

---

### 2. Conexión Pública (Desde tu PC)

En Railway UI → Servicio Postgres → Settings → Networking, encontrarás:

```bash
TCP Proxy: gondola.proxy.rlwy.net:58606
```

**Credenciales para herramientas locales (pgAdmin, DBeaver, psql):**

```bash
Host: gondola.proxy.rlwy.net
Port: 58606  # ← Cambia según tu proyecto
User: postgres
Password: (copia de Railway UI)
Database: railway
```

**Ejemplo con psql:**
```bash
psql "postgresql://postgres:TU_PASSWORD@gondola.proxy.rlwy.net:58606/railway"
```

---

## 📊 Comparación: Desarrollo Local vs Railway

| Aspecto | Desarrollo Local | Railway (Producción) |
|---------|------------------|----------------------|
| **Host PostgreSQL** | `localhost` | `postgres.railway.internal` |
| **Puerto PostgreSQL** | `5432` | `5432` |
| **Usuario** | `postgres` | `postgres` |
| **Base de datos** | `tu_base` | `railway` ⚠️ |
| **App escucha en** | `localhost` ✅ | `0.0.0.0` ⚠️ |
| **SSL PostgreSQL** | `false` | `{ rejectUnauthorized: false }` |
| **Builder** | `npm run start:dev` | Docker con Chromium |

---

## 🎯 Template de Checklist para Nuevo Proyecto

Usa esto cada vez que deploys un proyecto similar:

```markdown
## Pre-Deploy Checklist

### Código
- [ ] `main.ts` usa `app.listen(port, '0.0.0.0')`
- [ ] TypeORM configurado con variables PG*
- [ ] TypeORM tiene `ssl: { rejectUnauthorized: false }` en producción
- [ ] CORS habilitado si necesitas acceso desde frontend

### Archivos de Configuración
- [ ] `Dockerfile` existe (si usas Puppeteer)
- [ ] `Dockerfile` instala Chromium
- [ ] `railway.toml` existe
- [ ] `railway.toml` tiene `builder = "DOCKERFILE"`
- [ ] `.env.example` documentado

### Railway UI
- [ ] Servicio PostgreSQL creado
- [ ] Servicio Backend creado
- [ ] Variables PG* vinculadas en Backend
- [ ] Variable NODE_ENV=production configurada
- [ ] Variable MASTER_KEY configurada
- [ ] Public Networking habilitado en Backend
- [ ] Dominio público generado

### Verificación Post-Deploy
- [ ] Logs no muestran errores
- [ ] Endpoint `/health` responde 200
- [ ] Swagger accesible en `/api/docs`
- [ ] Base de datos conectada (no hay ECONNREFUSED)
```

---

## 💡 Tips y Buenas Prácticas

### 1. Usa `.env.example` siempre
```bash
# Mantén un .env.example sin valores sensibles
cp .env .env.example
# Edita .env.example y elimina valores reales
```

### 2. No commitees el .env real
```bash
# .gitignore
.env
.env.local
.env.production
```

### 3. Documenta las variables necesarias
```typescript
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.PGHOST, // REQUERIDO en Railway
    port: parseInt(process.env.PGPORT || '5432', 10),
    // ... etc
  },
});
```

### 4. Health Check endpoint
```typescript
// src/health/health.controller.ts
@Get('health')
async check() {
  return {
    status: 'ok',
    database: this.connection.isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
}
```

### 5. Logging estructurado
```typescript
// main.ts
console.log(`🚀 App started on port ${port}`);
console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
console.log(`🗄️  Database: ${process.env.PGHOST}:${process.env.PGPORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
```

---

## 📚 Referencias Útiles

- **Railway Docs:** https://docs.railway.app
- **Railway Templates:** https://railway.app/templates
- **NestJS Deployment:** https://docs.nestjs.com/deployment
- **Puppeteer Docker:** https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker

---

## 🆘 Si Todo Falla

1. **Elimina el servicio Backend en Railway**
2. **Vuelve a crearlo desde cero**
3. **Sigue el checklist paso a paso**
4. **NO agregues variables DB_*, solo PG***
5. **Verifica que railway.toml esté en la raíz del proyecto**
6. **Push a GitHub y espera 5 minutos**

---

## 📝 Notas Finales

- Railway cobra por uso, no por tiempo. Monitorea tus costos.
- El plan gratuito tiene $5 de crédito mensual.
- Los deployments con Docker tardan más pero son más confiables.
- Puppeteer consume mucha memoria - considera usar un servicio dedicado para alto volumen.

---

**Última actualización:** 2025-11-19
**Versiones probadas:**
- Node.js: 20.x
- NestJS: 10.x
- TypeORM: 0.3.x
- Puppeteer: 23.x
- Railway: v3 (builder config)

---

## ✅ Proyecto de Referencia

Este archivo viene del proyecto **screenshootfx_backend** que usa:
- ✅ NestJS
- ✅ PostgreSQL en Railway
- ✅ Puppeteer para screenshots
- ✅ TypeORM
- ✅ Docker deployment

**Repositorio:** https://github.com/jose890823/screenshootfx_backend

Si necesitas referencia visual o copiar configuración exacta, revisa este proyecto.
