import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO para captura múltiple de screenshots (endpoint /batch)
 */
export class BatchScreenshotDto {
  @ApiProperty({
    description: 'Array de símbolos de activos a capturar',
    example: ['XAUUSD', 'EURUSD', 'GBPUSD'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos un símbolo' })
  @IsString({ each: true })
  symbols: string[];

  @ApiProperty({
    description: 'Array de timeframes en minutos',
    example: ['240', '60', '5'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos un timeframe' })
  @IsString({ each: true })
  timeframes: string[];

  @ApiProperty({
    description: 'Plataforma de gráficos a utilizar',
    example: 'tradingview',
    enum: ['tradingview', 'investing'],
    default: 'tradingview',
    required: false,
  })
  @IsOptional()
  @IsIn(['tradingview', 'investing'], {
    message: 'Plataforma debe ser tradingview o investing',
  })
  platform?: string = 'tradingview';

  @ApiProperty({
    description: 'Incluir imágenes en formato base64 en la respuesta',
    example: true,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeBase64?: boolean = false;

  @ApiProperty({
    description: 'Ancho de la imagen en píxeles',
    example: 1920,
    default: 1920,
    minimum: 800,
    maximum: 3840,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(800, { message: 'El ancho mínimo es 800px' })
  @Max(3840, { message: 'El ancho máximo es 3840px (4K)' })
  width?: number = 1920;

  @ApiProperty({
    description: 'Alto de la imagen en píxeles',
    example: 1080,
    default: 1080,
    minimum: 600,
    maximum: 2160,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(600, { message: 'El alto mínimo es 600px' })
  @Max(2160, { message: 'El alto máximo es 2160px (4K)' })
  height?: number = 1080;

  @ApiProperty({
    description: 'Formato de la imagen',
    example: 'png',
    enum: ['png', 'jpg'],
    default: 'png',
    required: false,
  })
  @IsOptional()
  @IsIn(['png', 'jpg'], { message: 'Formato debe ser png o jpg' })
  format?: string = 'png';

  @ApiProperty({
    description: 'Guardar imágenes en almacenamiento local (usar false en producción para solo retornar base64)',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  saveToStorage?: boolean = false;
}
