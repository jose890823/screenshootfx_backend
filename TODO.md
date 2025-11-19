# TODO - Tareas Pendientes

## 🔴 Alta Prioridad

### Investing.com - Implementar Stealth Mode
**Fecha:** 2025-11-19
**Estado:** Pendiente
**Prioridad:** Alta (Plan B necesario)

**Problema:**
Investing.com detecta Puppeteer como bot y bloquea el acceso al gráfico, causando timeout en el selector del canvas.

**Solución Propuesta:**
Implementar `puppeteer-extra` con `puppeteer-extra-plugin-stealth` para evadir la detección de bots.

**Pasos:**
1. Instalar dependencias:
   ```bash
   npm install puppeteer-extra puppeteer-extra-plugin-stealth
   ```

2. Modificar `screenshots.service.ts` para usar puppeteer-extra solo para Investing.com:
   ```typescript
   import puppeteer from 'puppeteer-extra';
   import StealthPlugin from 'puppeteer-extra-plugin-stealth';

   if (platform === 'investing') {
     puppeteer.use(StealthPlugin());
   }
   ```

3. Agregar headers adicionales para Investing.com:
   ```typescript
   await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...');
   await page.setExtraHTTPHeaders({
     'Accept-Language': 'en-US,en;q=0.9',
   });
   ```

4. Considerar agregar cookies persistentes para evitar banners repetitivos

**Contexto:**
- Usuario usaba Investing.com con screenshotone.com y funcionaba bien
- Investing.com es el Plan B cuando TradingView falla
- URL correcta ya implementada: `https://www.investing.com/currencies/xau-usd-chart?period_type=intraday&timescale=60&candlesType=2&volumeType=1`
- Delay de 8 segundos ya configurado
- Selectores múltiples ya implementados: `canvas, #chart, .chart-wrapper, [data-test="chart-container"], .chart-canvas`

**Estimación:** 1-2 horas de trabajo

---

## ✅ Completado

### Actualizar Resolución a 2560x1440 (QHD/2K)
**Fecha:** 2025-11-19
**Estado:** ✅ Completado
**Motivo:** Mejor calidad para análisis de Smart Money Concepts con Claude AI

---

## 📝 Notas

- TradingView funciona perfectamente como plataforma principal
- Rendimiento actual: 3 screenshots en ~9 segundos
- Resolución óptima para Claude AI: 2560x1440 (balance calidad/rendimiento)
