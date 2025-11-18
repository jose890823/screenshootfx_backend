import { validate } from 'class-validator';
import { BatchScreenshotDto } from './batch-screenshot.dto';

describe('BatchScreenshotDto', () => {
  it('debe validar DTO correcto con valores mínimos', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe validar DTO completo con todas las opciones', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD', 'EURUSD'];
    dto.timeframes = ['240', '60', '5'];
    dto.platform = 'tradingview';
    dto.includeBase64 = true;
    dto.width = 1920;
    dto.height = 1080;
    dto.format = 'png';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe rechazar symbols vacío', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = [];
    dto.timeframes = ['240'];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('symbols');
  });

  it('debe rechazar timeframes vacío', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('timeframes');
  });

  it('debe rechazar plataforma inválida', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];
    dto.platform = 'invalid-platform' as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const platformError = errors.find((e) => e.property === 'platform');
    expect(platformError).toBeDefined();
  });

  it('debe aceptar plataformas válidas', async () => {
    const platforms = ['tradingview', 'investing'];

    for (const platform of platforms) {
      const dto = new BatchScreenshotDto();
      dto.symbols = ['XAUUSD'];
      dto.timeframes = ['240'];
      dto.platform = platform;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('debe rechazar width menor al mínimo', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];
    dto.width = 700; // Menor a 800

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const widthError = errors.find((e) => e.property === 'width');
    expect(widthError).toBeDefined();
  });

  it('debe rechazar width mayor al máximo', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];
    dto.width = 4000; // Mayor a 3840

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const widthError = errors.find((e) => e.property === 'width');
    expect(widthError).toBeDefined();
  });

  it('debe rechazar formato inválido', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];
    dto.format = 'gif' as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const formatError = errors.find((e) => e.property === 'format');
    expect(formatError).toBeDefined();
  });

  it('debe aceptar formatos válidos', async () => {
    const formats = ['png', 'jpg'];

    for (const format of formats) {
      const dto = new BatchScreenshotDto();
      dto.symbols = ['XAUUSD'];
      dto.timeframes = ['240'];
      dto.format = format;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('debe usar valores por defecto cuando no se proporcionan', () => {
    const dto = new BatchScreenshotDto();
    expect(dto.platform).toBe('tradingview');
    expect(dto.includeBase64).toBe(false);
    expect(dto.width).toBe(1920);
    expect(dto.height).toBe(1080);
    expect(dto.format).toBe('png');
    expect(dto.saveToStorage).toBe(false);
  });

  it('debe validar saveToStorage con valor true', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];
    dto.saveToStorage = true;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe validar saveToStorage con valor false', async () => {
    const dto = new BatchScreenshotDto();
    dto.symbols = ['XAUUSD'];
    dto.timeframes = ['240'];
    dto.saveToStorage = false;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
