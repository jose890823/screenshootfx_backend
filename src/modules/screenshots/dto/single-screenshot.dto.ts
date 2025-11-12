import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO para captura individual de screenshot (endpoint /single)
 */
export class SingleScreenshotDto {
  @ApiProperty({
    description: 'Símbolo del activo a capturar',
    example: 'XAUUSD',
  })
  @IsString()
  symbol: string;

  @ApiProperty({
    description: 'Timeframe en minutos',
    example: '240',
  })
  @IsString()
  timeframe: string;

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
}
