// =============================================
// Servicio DeepSeek
// Único punto de comunicación con la API de DeepSeek.
// Encapsula toda la lógica de IA.
// Si en el futuro se cambia de proveedor, solo se modifica este archivo.
// =============================================

import OpenAI from "openai";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { ConversationContext } from "./agent.types";
import { ToolDefinition } from "./tool.types";
import { toolbelt } from "./toolbelt";
import { SYSTEM_PROMPT } from "./prompts/system-prompt";

// Tipos internos del servicio
interface DeepSeekMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  name?: string;
}

interface DeepSeekToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface DeepSeekResponse {
  choices: {
    message: {
      content: string | null;
      tool_calls?: DeepSeekToolCall[];
    };
  }[];
}

// Configuración del cliente OpenAI apuntando a DeepSeek
let client: OpenAI | null = null;

const getClient = (): OpenAI => {
  if (!client) {
    client = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: env.DEEPSEEK_BASE_URL,
      maxRetries: 2,
      timeout: 30000,
    });
  }
  return client;
};

// Convierte el historial de conversación al formato de mensajes de DeepSeek
const buildMessages = (context: ConversationContext): DeepSeekMessage[] => {
  const messages: DeepSeekMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // ---------- CONTEXTO ENRIQUECIDO PARA LA IA ----------
  // Inyectar datos del cliente recolectados durante la conversación
  // para que la IA adapte su tono y recomendaciones.
  const clientContextParts: string[] = [];

  // Datos del cliente (si existen)
  const { collectedData, agentState } = context;
  if (collectedData.name) {
    clientContextParts.push(`Cliente: ${collectedData.name}`);
  }
  if (collectedData.genre) {
    clientContextParts.push(`Género de interés: ${collectedData.genre}`);
  }
  if (collectedData.projectType) {
    clientContextParts.push(`Tipo de proyecto: ${collectedData.projectType}`);
  }
  if (collectedData.budget) {
    clientContextParts.push(`Presupuesto mencionado: ${collectedData.budget}`);
  }

  // Estado de la conversación
  clientContextParts.push(`Turno #${agentState.turnCount}`);
  if (agentState.lastToolUsed) {
    clientContextParts.push(`Última herramienta usada: ${agentState.lastToolUsed}`);
  }
  if (agentState.handoffRequested) {
    clientContextParts.push("El cliente ya solicitó hablar con un humano.");
  }
  if (agentState.readyToBuy) {
    clientContextParts.push("El cliente está listo para comprar.");
  }

  if (clientContextParts.length > 0) {
    messages.push({
      role: "system",
      content: `[CONTEXTO DE LA CONVERSACIÓN]\n${clientContextParts.join("\n")}`,
    });
  }
  // --------------------------------------------------------

  // Solo enviamos los últimos 15 mensajes para no exceder el contexto.
  // Se excluyen los mensajes del admin enviados manualmente desde el panel:
  // el agente automático NO debe considerarlos como parte de la conversación
  // que "Mateo" ya respondió (evita que la IA asuma que las respuestas manuales
  // son suyas). Con cero mensajes admin, este filtro es un no-op.
  const recentMessages = context.messages
    .filter((msg) => msg.role !== "admin")
    .slice(-15);

  for (const msg of recentMessages) {
    messages.push({
      role: msg.role === "client" ? "user" : "assistant",
      content: msg.content,
    });
  }

  return messages;
};

// Convierte las herramientas del Toolbelt al formato de OpenAI/DeepSeek
const buildTools = () => {
  return toolbelt.getAll().map((tool: ToolDefinition) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
};

// Parsea los argumentos de una tool call (JSON string → objeto)
const parseToolArguments = (args: string): Record<string, unknown> => {
  try {
    return JSON.parse(args);
  } catch {
    logger.warn(`Failed to parse tool arguments: ${args}`);
    return {};
  }
};

// =============================================
// API PÚBLICA DEL SERVICIO
// =============================================

export const deepseekService = {
  /**
   * Envía el contexto de conversación a DeepSeek y obtiene una decisión.
   * DeepSeek puede responder con:
   *   - Un tool_call (necesita ejecutar una herramienta)
   *   - Un mensaje directo (ya tiene suficiente info)
   */
  decide: async (
    context: ConversationContext
  ): Promise<{
    type: "tool_call" | "direct_response";
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    content?: string;
  }> => {
    const messages = buildMessages(context);
    const tools = buildTools();

    logger.info("[DeepSeek] Sending request...");

    try {
      // Forzar tipado con any porque las versiones de tipos de OpenAI SDK pueden variar
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = (await (getClient() as any).chat.completions.create({
        model: "deepseek-chat",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000,
      })) as DeepSeekResponse;

      const choice = response.choices[0];
      const message = choice.message;

      // DeepSeek decidió usar una herramienta
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        logger.info(
          `[DeepSeek] Tool call: ${toolCall.function.name}`
        );

        return {
          type: "tool_call",
          toolName: toolCall.function.name,
          toolArgs: parseToolArguments(toolCall.function.arguments),
        };
      }

      // DeepSeek respondió directamente
      logger.info("[DeepSeek] Direct response");
      return {
        type: "direct_response",
        content: message.content || "Lo siento, no pude generar una respuesta.",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      logger.error(`[DeepSeek] API error: ${message}`);
      throw new Error(`DeepSeek API error: ${message}`);
    }
  },

  /**
   * Envía el resultado de una herramienta a DeepSeek para que formule la respuesta final.
   */
  formulateResponse: async (
    context: ConversationContext,
    toolResult: string
  ): Promise<string> => {
    const messages = buildMessages(context);

    // Agregar el resultado de la herramienta como mensaje del sistema
    messages.push({
      role: "user",
      content: `Información obtenida de las herramientas:\n\n${toolResult}\n\nCon base en esta información, formula una respuesta natural y profesional para el cliente. No inventes datos que no estén en la información proporcionada.`,
    });

    logger.info("[DeepSeek] Formulating response...");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = (await (getClient() as any).chat.completions.create({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: 800,
      })) as DeepSeekResponse;

      return (
        response.choices[0].message.content ||
        "Lo siento, no pude formular una respuesta en este momento."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      logger.error(`[DeepSeek] Formulation error: ${message}`);
      throw new Error(`DeepSeek formulation error: ${message}`);
    }
  },
};