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
import resourceRoutes from "./routes/resource.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

// ---------- Global Middlewares ----------

// Helmet: security headers
// Por defecto la CSP de Helmet limita media-src y connect-src a 'self'.
// Se agregan los orígenes de Supabase Storage para permitir reproducir y
// descargar el audio del chat (sin debilitar el resto de directivas).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "media-src": ["'self'", "https://*.supabase.co"],
        "connect-src": ["'self'", "https://*.supabase.co"],
        "img-src": ["'self'", "data:", "https://*.supabase.co"],
      },
    },
  })
);

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

// ---------- Admin Panel (static files) ----------
import path from "path";
const adminDist = path.join(__dirname, "..", "admin-panel", "dist");
app.use("/admin", express.static(adminDist));
// SPA fallback: rutas del panel que no son archivos estáticos devuelven index.html
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(adminDist, "index.html"));
});
app.get("/admin{/*path}", (_req, res) => {
  res.sendFile(path.join(adminDist, "index.html"));
});

// ---------- Routes ----------

app.use("/", routes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/admin", adminRoutes);

// ---------- Error Handling ----------

// 404: catch unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;