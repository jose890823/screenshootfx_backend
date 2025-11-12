import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * API Key Entity para sistema de autenticación robusto
 * Almacena keys hasheadas con bcrypt
 */
@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'key_hash' })
  keyHash: string;

  @Column({ name: 'key_prefix', length: 8 })
  keyPrefix: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'rate_limit', default: 100 })
  rateLimit: number;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
