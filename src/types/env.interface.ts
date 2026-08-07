export interface EnvConfig {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  CORS_ORIGIN: string;
  LOG_LEVEL: string;
  DATABASE_URL: string;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_STORAGE_BUCKET: string;
  WHATSAPP_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
}