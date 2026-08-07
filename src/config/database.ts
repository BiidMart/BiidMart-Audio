import { Pool } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
    });

    pool.on("error", (err) => {
      logger.error("Unexpected error on idle client", { error: err.message });
    });
  }

  return pool;
};

export const connectDatabase = async (): Promise<void> => {
  const client = await getPool().connect();

  try {
    await client.query("SELECT 1");
    logger.info("✓ Connected to PostgreSQL");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`✗ Failed to connect to PostgreSQL: ${message}`);
    throw error;
  } finally {
    client.release();
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("Database connection closed");
  }
};