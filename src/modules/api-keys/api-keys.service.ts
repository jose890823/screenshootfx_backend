import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto } from './dto/api-key-response.dto';

/**
 * Servicio para gestión de API Keys con almacenamiento seguro en BD
 */
@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Genera una nueva API Key con formato: sk_live_[random_40_chars]
   */
  private generateApiKey(): string {
    const prefix = 'sk_live_';
    const randomPart = randomBytes(30).toString('hex'); // 60 chars hex
    return `${prefix}${randomPart}`;
  }

  /**
   * Crea una nueva API Key
   * Retorna la key completa solo una vez
   */
  async create(dto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    this.logger.log(`Creando nueva API Key: ${dto.name}`);

    // Verificar nombre único
    const existingKey = await this.apiKeyRepository.findOne({
      where: { name: dto.name },
    });

    if (existingKey) {
      throw new ConflictException(
        `Ya existe una API Key con el nombre "${dto.name}"`,
      );
    }

    // Generar key
    const apiKey = this.generateApiKey();
    const keyPrefix = apiKey.substring(0, 8); // sk_live_
    const keyHash = await bcrypt.hash(apiKey, this.saltRounds);

    // Parsear expiresAt si existe
    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
    }

    // Crear entidad
    const newKey = this.apiKeyRepository.create({
      name: dto.name,
      keyHash,
      keyPrefix,
      rateLimit: dto.rateLimit || 100,
      expiresAt: expiresAt,
      isActive: true,
      usageCount: 0,
      lastUsedAt: null,
    });

    const savedKey = await this.apiKeyRepository.save(newKey);

    this.logger.log(
      `API Key creada exitosamente: ${savedKey.id} (${savedKey.name})`,
    );

    // Retornar con key completa (solo esta vez)
    return {
      id: savedKey.id,
      name: savedKey.name,
      key: apiKey, // ⚠️ Solo se retorna aquí
      keyPrefix: savedKey.keyPrefix,
      isActive: savedKey.isActive,
      rateLimit: savedKey.rateLimit,
      createdAt: savedKey.createdAt,
      lastUsedAt: savedKey.lastUsedAt,
      expiresAt: savedKey.expiresAt,
      usageCount: savedKey.usageCount,
    };
  }

  /**
   * Valida una API Key
   * Actualiza lastUsedAt y usageCount si es válida
   */
  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    if (!apiKey || !apiKey.startsWith('sk_live_')) {
      return null;
    }

    // Buscar todas las keys activas
    const activeKeys = await this.apiKeyRepository.find({
      where: { isActive: true },
    });

    // Comparar con bcrypt
    for (const key of activeKeys) {
      const isMatch = await bcrypt.compare(apiKey, key.keyHash);

      if (isMatch) {
        // Verificar expiración
        if (key.expiresAt && new Date() > key.expiresAt) {
          this.logger.warn(`API Key expirada: ${key.id} (${key.name})`);
          return null;
        }

        // Actualizar último uso
        key.lastUsedAt = new Date();
        key.usageCount += 1;
        await this.apiKeyRepository.save(key);

        this.logger.debug(`API Key validada: ${key.id} (${key.name})`);
        return key;
      }
    }

    return null;
  }

  /**
   * Lista todas las API Keys
   */
  async findAll(): Promise<ApiKeyResponseDto[]> {
    const keys = await this.apiKeyRepository.find({
      order: { createdAt: 'DESC' },
    });

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      isActive: key.isActive,
      rateLimit: key.rateLimit,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      usageCount: key.usageCount,
    }));
  }

  /**
   * Obtiene una API Key por ID
   */
  async findOne(id: string): Promise<ApiKeyResponseDto> {
    const key = await this.apiKeyRepository.findOne({ where: { id } });

    if (!key) {
      throw new NotFoundException(`API Key con ID "${id}" no encontrada`);
    }

    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      isActive: key.isActive,
      rateLimit: key.rateLimit,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      usageCount: key.usageCount,
    };
  }

  /**
   * Revoca una API Key (soft delete)
   */
  async revoke(id: string): Promise<{ message: string }> {
    const key = await this.apiKeyRepository.findOne({ where: { id } });

    if (!key) {
      throw new NotFoundException(`API Key con ID "${id}" no encontrada`);
    }

    key.isActive = false;
    await this.apiKeyRepository.save(key);

    this.logger.log(`API Key revocada: ${id} (${key.name})`);

    return {
      message: `API Key "${key.name}" revocada exitosamente`,
    };
  }

  /**
   * Elimina permanentemente una API Key
   */
  async remove(id: string): Promise<{ message: string }> {
    const key = await this.apiKeyRepository.findOne({ where: { id } });

    if (!key) {
      throw new NotFoundException(`API Key con ID "${id}" no encontrada`);
    }

    await this.apiKeyRepository.remove(key);

    this.logger.log(`API Key eliminada permanentemente: ${id} (${key.name})`);

    return {
      message: `API Key "${key.name}" eliminada permanentemente`,
    };
  }

  /**
   * Limpia keys expiradas automáticamente
   */
  async cleanExpiredKeys(): Promise<{ removed: number }> {
    const now = new Date();
    const expiredKeys = await this.apiKeyRepository
      .createQueryBuilder('api_key')
      .where('api_key.expiresAt < :now', { now })
      .andWhere('api_key.isActive = :isActive', { isActive: true })
      .getMany();

    if (expiredKeys.length > 0) {
      for (const key of expiredKeys) {
        key.isActive = false;
      }
      await this.apiKeyRepository.save(expiredKeys);
      this.logger.log(`${expiredKeys.length} API Keys expiradas desactivadas`);
    }

    return { removed: expiredKeys.length };
  }
}
