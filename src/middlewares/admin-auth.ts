// =============================================
// Middleware de Autenticación para Admin API
// Protege endpoints de administración de conocimiento
// usando un API Key simple (ADMIN_API_KEY en .env)
// =============================================

import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export const adminAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Si no hay ADMIN_API_KEY configurada, permitir acceso (desarrollo local)
  if (!env.ADMIN_API_KEY) {
    logger.warn("[AdminAuth] ADMIN_API_KEY not set — allowing all requests");
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: { message: "Unauthorized. Use Bearer <ADMIN_API_KEY>" },
    });
    return;
  }

  const token = authHeader.slice(7); // quitar "Bearer "
  if (token !== env.ADMIN_API_KEY) {
    res.status(403).json({
      error: { message: "Forbidden. Invalid API key." },
    });
    return;
  }

  next();
};