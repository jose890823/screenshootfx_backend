import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Servicio para interactuar con Supabase
 * Maneja tanto la conexión a la base de datos como al storage
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient | null = null;
  private readonly storageBucket: string;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseKey = this.configService.get<string>('supabase.anonKey');
    this.storageBucket =
      this.configService.get<string>('supabase.storageBucket') || 'screenshots';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('✅ Supabase client initialized successfully');
      this.ensureStorageBucket();
    } else {
      this.logger.warn(
        '⚠️ Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY to enable.',
      );
    }
  }

  /**
   * Obtiene el cliente de Supabase
   */
  getClient(): SupabaseClient | null {
    return this.supabase;
  }

  /**
   * Verifica si Supabase está configurado
   */
  isConfigured(): boolean {
    return this.supabase !== null;
  }

  /**
   * Sube un archivo al storage de Supabase
   */
  async uploadFile(
    filename: string,
    buffer: Buffer,
    contentType: string = 'image/png',
  ): Promise<{ url: string; path: string } | null> {
    if (!this.supabase) {
      this.logger.error('Supabase not configured');
      return null;
    }

    try {
      const filePath = `${new Date().toISOString().split('T')[0]}/${filename}`;

      const { data, error } = await this.supabase.storage
        .from(this.storageBucket)
        .upload(filePath, buffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        this.logger.error(`Error uploading to Supabase: ${error.message}`);
        return null;
      }

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.storageBucket).getPublicUrl(filePath);

      this.logger.log(`✅ File uploaded to Supabase: ${publicUrl}`);

      return {
        url: publicUrl,
        path: filePath,
      };
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      return null;
    }
  }

  /**
   * Elimina un archivo del storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase.storage
        .from(this.storageBucket)
        .remove([filePath]);

      if (error) {
        this.logger.error(`Error deleting file: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`);
      return false;
    }
  }

  /**
   * Asegura que el bucket de storage existe
   */
  private async ensureStorageBucket() {
    if (!this.supabase) return;

    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();

      const bucketExists = buckets?.some((b) => b.name === this.storageBucket);

      if (!bucketExists) {
        this.logger.log(
          `Creating Supabase storage bucket: ${this.storageBucket}`,
        );
        const { error } = await this.supabase.storage.createBucket(
          this.storageBucket,
          {
            public: true,
          },
        );

        if (error) {
          this.logger.error(
            `Failed to create storage bucket: ${error.message}`,
          );
        } else {
          this.logger.log(`✅ Storage bucket created: ${this.storageBucket}`);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Could not verify storage bucket: ${error.message}. It may already exist.`,
      );
    }
  }
}
