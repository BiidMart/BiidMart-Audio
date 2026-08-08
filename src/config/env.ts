import dotenv from "dotenv";
import { EnvConfig } from "../types/env.interface";

dotenv.config();

export const env: EnvConfig = {
  NODE_ENV: (process.env.NODE_ENV as EnvConfig["NODE_ENV"]) || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "biidmart-media",
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || "",
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || "",
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || "openai",
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
};
