// =============================================
// Herramienta: handoff_to_human (STUB)
// Transfiere la conversación al asesor humano
// =============================================

import { logger } from "../../utils/logger";
import {
  ToolDefinition,
  HandoffToHumanInput,
  HandoffToHumanOutput,
} from "../tool.types";

export const handoffToHumanTool: ToolDefinition<
  HandoffToHumanInput,
  HandoffToHumanOutput
> = {
  name: "handoff_to_human",
  description:
    "Transfiere la conversación al asesor humano. Úsala cuando el cliente pida hablar con una persona, cuando el Agente no pueda responder, o cuando el cliente esté frustrado.",
  inputSchema: {
    type: "object",
    properties: {
      reason: { type: "string", description: "Motivo de la transferencia" },
      summary: { type: "string", description: "Resumen de la conversación" },
    },
    required: ["reason", "summary"],
  },

  execute: async (input: HandoffToHumanInput): Promise<HandoffToHumanOutput> => {
    logger.info(`[STUB] handoff_to_human: reason=${input.reason}`);
    return { transferred: true, reason: input.reason, summary: input.summary };
  },
};