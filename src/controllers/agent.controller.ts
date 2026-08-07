// =============================================
// Controlador del Agente IA
// =============================================

import { Request, Response, NextFunction } from "express";
import { orchestrator } from "../agent/orchestrator";
import { conversationMemory } from "../agent/memory/conversation-memory";
import { logger } from "../utils/logger";

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId, phone, message } = req.body;

    if (!sessionId || !phone || !message) {
      res.status(400).json({
        error: {
          message: "sessionId, phone, and message are required",
        },
      });
      return;
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({
        error: {
          message: "message must be a non-empty string",
        },
      });
      return;
    }

    const result = await orchestrator.processMessage(sessionId, phone, message.trim());

    logger.info(
      `[Agent API] ${sessionId} -> ${result.phase} (${result.toolUsed || "none"})`
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getContext = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const sessionId = req.params.sessionId as string;
    const context = conversationMemory.get(sessionId);

    if (!context) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    res.json(context);
  } catch (error) {
    next(error);
  }
};

export const resetSession = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const sessionId = req.params.sessionId as string;
    conversationMemory.delete(sessionId);
    res.json({ message: "Session reset successfully" });
  } catch (error) {
    next(error);
  }
};