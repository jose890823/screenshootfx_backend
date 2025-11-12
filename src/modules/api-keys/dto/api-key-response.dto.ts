import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para respuesta al crear una API Key
 * IMPORTANTE: La key completa solo se muestra UNA VEZ en la creación
 */
export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'ID único de la API Key',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre descriptivo de la key',
    example: 'Make.com Production',
  })
  name: string;

  @ApiProperty({
    description:
      'API Key completa (solo se muestra al crear, después solo el prefijo)',
    example: 'screenshot_live_abc123def456ghi789jkl012mno345pqr678',
  })
  key?: string;

  @ApiProperty({
    description: 'Prefijo de la key para identificación',
    example: 'sk_live_',
  })
  keyPrefix: string;

  @ApiProperty({
    description: 'Estado de la key',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Límite de peticiones por minuto',
    example: 100,
  })
  rateLimit: number;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última uso (puede ser null)',
    example: '2025-01-15T14:25:30Z',
    required: false,
  })
  lastUsedAt?: Date | null;

  @ApiProperty({
    description: 'Fecha de expiración (opcional)',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  expiresAt?: Date | null;

  @ApiProperty({
    description: 'Contador de usos',
    example: 1523,
  })
  usageCount: number;
}
