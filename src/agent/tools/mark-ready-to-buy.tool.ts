// =============================================
// Herramienta: mark_ready_to_buy (STUB)
// Marca al cliente como listo para comprar
// =============================================

import { logger } from "../../utils/logger";
import {
  ToolDefinition,
  MarkReadyToBuyInput,
  MarkReadyToBuyOutput,
} from "../tool.types";

export const markReadyToBuyTool: ToolDefinition<
  MarkReadyToBuyInput,
  MarkReadyToBuyOutput
> = {
  name: "mark_ready_to_buy",
  description:
    "Marca al cliente como listo para comprar y notifica al asesor humano con prioridad alta. Úsala cuando el cliente exprese intención clara de compra.",
  inputSchema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Resumen: qué quiere comprar el cliente, datos relevantes",
      },
    },
    required: ["summary"],
  },

  execute: async (input: MarkReadyToBuyInput): Promise<MarkReadyToBuyOutput> => {
    logger.info(`[STUB] mark_ready_to_buy: ${input.summary}`);
    return { marked: true, summary: input.summary };
  },
};