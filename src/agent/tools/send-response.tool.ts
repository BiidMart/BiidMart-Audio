// =============================================
// Herramienta: send_response
// Envía la respuesta final al cliente vía WhatsApp.
// =============================================

import { logger } from "../../utils/logger";
import {
  ToolDefinition,
  SendResponseInput,
  SendResponseOutput,
} from "../tool.types";

export const sendResponseTool: ToolDefinition<
  SendResponseInput,
  SendResponseOutput
> = {
  name: "send_response",
  description:
    "Envía la respuesta final al cliente vía WhatsApp. Úsala cuando ya tengas toda la información necesaria y estés listo para responder.",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Texto de la respuesta" },
      attachments: {
        type: "array",
        items: { type: "string" },
        description: "URLs de archivos adjuntos (opcional)",
      },
    },
    required: ["text"],
  },

  execute: async (input: SendResponseInput): Promise<SendResponseOutput> => {
    // Nota: El número de teléfono se obtiene del contexto de conversación.
    // El Orquestador es responsable de pasar el phone al toolbelt.
    // Esta herramienta recibe el texto y los attachments, y los envía.
    
    logger.info(`[send_response] Preparing to send: "${input.text.substring(0, 80)}..."`);

    // El envío real a WhatsApp lo hace el webhook controller
    // porque tiene acceso al número de teléfono del cliente.
    // Esta herramienta devuelve el contenido para que el Orquestador
    // lo incluya en el AgentTurnResult, y el webhook lo entregue.

    return {
      sent: true,
      text: input.text,
      attachments: input.attachments,
    };
  },
};