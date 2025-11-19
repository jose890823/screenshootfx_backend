/**
 * Configuración centralizada de la aplicación
 * Todas las variables de entorno se acceden desde aquí
 */
export default () => ({
  // Configuración del servidor
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Seguridad
  masterKey: process.env.MASTER_KEY,

  // Base de datos
  // Railway provee variables PG* automáticamente, con fallback a DB_*
  database: {
    host: process.env.PGHOST || process.env.DB_HOST,
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
    username: process.env.PGUSER || process.env.DB_USERNAME,
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
    database: process.env.PGDATABASE || process.env.DB_DATABASE,
  },

  // Puppeteer
  puppeteer: {
    maxConcurrentScreenshots: parseInt(
      process.env.MAX_CONCURRENT_SCREENSHOTS || '3',
      10,
    ),
    screenshotTimeout: parseInt(process.env.SCREENSHOT_TIMEOUT || '30000', 10),
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '20', 10),
  },

  // Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    path: process.env.STORAGE_PATH || './storage/screenshots',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET,
    },
  },

  // Supabase (Opcional - para DB y/o Storage)
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'screenshots',
  },
});
