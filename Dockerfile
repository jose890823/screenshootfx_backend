# Imagen base con Node.js 20
FROM node:20-slim

# Instalar dependencias necesarias para Puppeteer/Chromium
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

# Configurar Puppeteer para usar el Chromium instalado del sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluye devDependencies para el build)
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar la aplicación TypeScript
RUN npm run build

# Crear directorio para screenshots
RUN mkdir -p /app/storage/screenshots

# Exponer el puerto (Railway usa la variable PORT)
# Railway asigna dinámicamente el puerto, no usar EXPOSE fijo
# EXPOSE 3000

# Usuario no-root para seguridad (comentado temporalmente para debugging)
# RUN groupadd -r appuser && useradd -r -g appuser appuser
# RUN chown -R appuser:appuser /app
# USER appuser

# Comando para iniciar la aplicación
CMD ["node", "dist/main.js"]
