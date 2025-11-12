import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, IsNotEmpty } from 'class-validator';

/**
 * DTO para crear una nueva API Key
 */
export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Nombre descriptivo para identificar la API Key',
    example: 'Make.com Production',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  name: string;

  @ApiProperty({
    description: 'Límite de peticiones por minuto para esta key',
    example: 100,
    default: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'El rate limit mínimo es 1' })
  rateLimit?: number = 100;

  @ApiProperty({
    description: 'Fecha de expiración en ISO 8601 (opcional)',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
