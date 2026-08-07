import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { notFoundHandler } from "./middlewares/not-found";
import { errorHandler } from "./middlewares/error-handler";
import routes from "./routes";
import knowledgeRoutes from "./routes/knowledge.routes";
import agentRoutes from "./routes/agent.routes";
import webhookRoutes from "./routes/webhook.routes";
import clientRoutes from "./routes/client.routes";
import paymentRoutes from "./routes/payment.routes";

const app = express();

// ---------- Global Middlewares ----------

// Helmet: security headers
app.use(helmet());

// CORS: cross-origin requests
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

// Morgan: HTTP request logging (streamed through Winston)
app.use(
  morgan("short", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Routes ----------

app.use("/", routes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/payments", paymentRoutes);

// ---------- Error Handling ----------

// 404: catch unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;