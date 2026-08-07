// =============================================
// Herramienta: ask_clarification (STUB)
// Hace una pregunta al cliente antes de responder
// =============================================

import { logger } from "../../utils/logger";
import {
  ToolDefinition,
  AskClarificationInput,
  AskClarificationOutput,
} from "../tool.types";

export const askClarificationTool: ToolDefinition<
  AskClarificationInput,
  AskClarificationOutput
> = {
  name: "ask_clarification",
  description:
    "Hace una pregunta al cliente cuando el Agente necesita más información antes de poder responder correctamente.",
  inputSchema: {
    type: "object",
    properties: {
      question: { type: "string", description: "La pregunta que se hará al cliente" },
    },
    required: ["question"],
  },

  execute: async (input: AskClarificationInput): Promise<AskClarificationOutput> => {
    logger.info(`[STUB] ask_clarification: ${input.question}`);
    return { question: input.question, asked: true };
  },
};