import app from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import { runMigrations } from "./config/migrate";
import { logger } from "./utils/logger";
import { startMediaCleanupJob } from "./jobs/media-cleanup";

const { PORT, NODE_ENV } = env;

const start = async (): Promise<void> => {
  try {
    await connectDatabase();
    await runMigrations();
    startMediaCleanupJob();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Database connection failed: ${message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} [${NODE_ENV}]`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
  });
};

start();