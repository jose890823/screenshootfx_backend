import { validate } from 'class-validator';
import { SingleScreenshotDto } from './single-screenshot.dto';

describe('SingleScreenshotDto', () => {
  it('debe validar DTO correcto con valores mínimos', async () => {
    const dto = new SingleScreenshotDto();
    dto.symbol = 'XAUUSD';
    dto.timeframe = '240';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe validar DTO completo con todas las opciones', async () => {
    const dto = new SingleScreenshotDto();
    dto.symbol = 'EURUSD';
    dto.timeframe = '60';
    dto.platform = 'investing';
    dto.width = 2560;
    dto.height = 1440;
    dto.format = 'jpg';
    dto.includeBase64 = true;
    dto.saveToStorage = true;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe rechazar symbol vacío', async () => {
    const dto = new SingleScreenshotDto();
    dto.symbol = '';
    dto.timeframe = '240';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe rechazar timeframe vacío', async () => {
    const dto = new SingleScreenshotDto();
    dto.symbol = 'XAUUSD';
    dto.timeframe = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe rechazar plataforma inválida', async () => {
    const dto = new SingleScreenshotDto();
    dto.symbol = 'XAUUSD';
    dto.timeframe = '240';
    dto.platform = 'binance' as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const platformError = errors.find((e) => e.property === 'platform');
    expect(platformError).toBeDefined();
  });

  it('debe aceptar ambas plataformas válidas', async () => {
    const platforms = ['tradingview', 'investing'];

    for (const platform of platforms) {
      const dto = new SingleScreenshotDto();
      dto.symbol = 'GBPUSD';
      dto.timeframe = '15';
      dto.platform = platform;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('debe usar valores por defecto cuando no se proporcionan', () => {
    const dto = new SingleScreenshotDto();
    expect(dto.platform).toBe('tradingview');
    expect(dto.width).toBe(1920);
    expect(dto.height).toBe(1080);
    expect(dto.format).toBe('png');
    expect(dto.includeBase64).toBe(false);
    expect(dto.saveToStorage).toBe(false);
  });

  it('debe rechazar dimensiones fuera de rango', async () => {
    const dto = new SingleScreenshotDto();
    dto.symbol = 'XAUUSD';
    dto.timeframe = '240';
    dto.width = 500; // Muy pequeño

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe validar includeBase64 y saveToStorage correctamente', async () => {
    const dto = new SingleScreenshotDto();
    dto.symbol = 'XAUUSD';
    dto.timeframe = '240';
    dto.includeBase64 = true;
    dto.saveToStorage = false; // Modo producción: solo base64

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
