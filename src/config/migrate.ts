import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getPool } from "./database";
import { logger } from "../utils/logger";

const MIGRATIONS_DIR = join(__dirname, "migrations");

export const runMigrations = async (): Promise<void> => {
  const client = await getPool().connect();

  try {
    // Crear tabla de control de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id          SERIAL PRIMARY KEY,
        filename    VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Leer archivos de migración ordenados
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      // Verificar si ya fue ejecutada
      const { rows } = await client.query(
        "SELECT id FROM _migrations WHERE filename = $1",
        [filename]
      );

      if (rows.length > 0) {
        logger.info(`Migration already executed: ${filename}`);
        continue;
      }

      // Ejecutar migración
      const filepath = join(MIGRATIONS_DIR, filename);
      const sql = readFileSync(filepath, "utf-8");

      logger.info(`Running migration: ${filename}`);
      await client.query(sql);
      await client.query(
        "INSERT INTO _migrations (filename) VALUES ($1)",
        [filename]
      );
      logger.info(`✓ Migration completed: ${filename}`);
    }
  } finally {
    client.release();
  }
};