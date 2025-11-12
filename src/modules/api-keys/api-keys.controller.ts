import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto } from './dto/api-key-response.dto';
import { MasterKeyGuard } from '../../common/guards/master-key.guard';

/**
 * Controlador para gestión de API Keys
 * Protegido con Master Key para seguridad adicional
 */
@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(MasterKeyGuard)
@ApiSecurity('master-key')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear nueva API Key',
    description:
      '⚠️ IMPORTANTE: La key completa solo se muestra UNA VEZ. Guárdala en un lugar seguro.',
  })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({
    status: 201,
    description: 'API Key creada exitosamente',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'Master Key inválida' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado' })
  async create(
    @Body() createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.create(createApiKeyDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas las API Keys',
    description: 'Retorna todas las keys (sin mostrar la key completa)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de API Keys',
    type: [ApiKeyResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Master Key inválida' })
  async findAll(): Promise<ApiKeyResponseDto[]> {
    return this.apiKeysService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una API Key por ID',
    description: 'Retorna los detalles de una key específica',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la API Key',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'API Key encontrada',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Master Key inválida' })
  @ApiResponse({ status: 404, description: 'API Key no encontrada' })
  async findOne(@Param('id') id: string): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.findOne(id);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revocar una API Key',
    description:
      'Desactiva la key sin eliminarla (soft delete). Se mantiene el historial.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la API Key a revocar',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'API Key revocada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'API Key "Make.com Production" revocada exitosamente',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Master Key inválida' })
  @ApiResponse({ status: 404, description: 'API Key no encontrada' })
  async revoke(@Param('id') id: string): Promise<{ message: string }> {
    return this.apiKeysService.revoke(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar permanentemente una API Key',
    description:
      '⚠️ PELIGRO: Elimina la key de forma permanente. Esta acción no se puede deshacer.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la API Key a eliminar',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'API Key eliminada permanentemente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'API Key "Make.com Production" eliminada permanentemente',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Master Key inválida' })
  @ApiResponse({ status: 404, description: 'API Key no encontrada' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.apiKeysService.remove(id);
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar keys expiradas',
    description: 'Desactiva automáticamente todas las keys que hayan expirado',
  })
  @ApiResponse({
    status: 200,
    description: 'Limpieza completada',
    schema: {
      type: 'object',
      properties: {
        removed: {
          type: 'number',
          example: 3,
          description: 'Número de keys expiradas desactivadas',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Master Key inválida' })
  async cleanup(): Promise<{ removed: number }> {
    return this.apiKeysService.cleanExpiredKeys();
  }
}
