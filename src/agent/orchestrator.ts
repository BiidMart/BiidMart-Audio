// =============================================
// Orquestador: Ciclo pensar → decidir → actuar
// =============================================
// El Orquestador NO toma decisiones de negocio.
// DeepSeek decide QUÉ herramienta usar y CÓMO responder.
// El Orquestador solo ejecuta, registra y coordina.

import { logger } from "../utils/logger";
import { conversationMemory } from "./memory/conversation-memory";
import { toolbelt } from "./toolbelt";
import { deepseekService } from "./deepseek.service";
import { AgentTurnResult, ConversationContext } from "./agent.types";
import {
  ToolName,
  SearchKnowledgeOutput,
  GetMultimediaOutput,
  AskClarificationOutput,
  HandoffToHumanOutput,
} from "./tool.types";

// =============================================
// CICLO PRINCIPAL
// =============================================

export const orchestrator = {
  processMessage: async (
    sessionId: string,
    clientPhone: string,
    message: string
  ): Promise<AgentTurnResult> => {
    // ---------- PASO 1: RECUPERAR CONTEXTO ----------
    const context = conversationMemory.getOrCreate(sessionId, clientPhone);
    context.agentState.currentPhase = "analyzing";
    context.agentState.turnCount++;

    // Guardar mensaje del cliente
    conversationMemory.addMessage(sessionId, {
      role: "client",
      content: message,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      `[Agent] Turn ${context.agentState.turnCount} | Session: ${sessionId} | Message: "${message.substring(0, 80)}..."`
    );

    try {
      // ---------- PASO 2: DEEPSEEK DECIDE ----------
      context.agentState.currentPhase = "deciding";
      const decision = await deepseekService.decide(context);

      // ---------- PASO 3: EJECUTAR SEGÚN DECISIÓN ----------
      let result: AgentTurnResult;

      if (decision.type === "direct_response") {
        // DeepSeek decidió responder directamente sin herramientas
        result = await handleDirectResponse(
          context,
          sessionId,
          decision.content || "Lo siento, no pude generar una respuesta."
        );
      } else if (decision.type === "tool_call" && decision.toolName) {
        // DeepSeek decidió usar una herramienta
        result = await handleToolCall(
          context,
          sessionId,
          decision.toolName as ToolName,
          decision.toolArgs || {}
        );
      } else {
        result = {
          phase: "error",
          toolUsed: null,
          response: "Lo siento, ocurrió un error al procesar tu mensaje.",
          error: "Invalid decision from DeepSeek",
        };
      }

      // ---------- PASO 4: GUARDAR RESPUESTA ----------
      context.agentState.currentPhase = result.phase;
      context.agentState.lastToolUsed = result.toolUsed;
      conversationMemory.addMessage(sessionId, {
        role: "agent",
        content: result.response,
        timestamp: new Date().toISOString(),
      });

      logger.info(
        `[Agent] Turn ${context.agentState.turnCount} complete | Phase: ${result.phase} | Tool: ${result.toolUsed || "none"}`
      );

      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[Agent] Error in turn: ${errMsg}`);
      context.agentState.currentPhase = "error";

      const fallbackResponse =
        "Lo siento, ocurrió un error al procesar tu mensaje. ¿Podrías intentarlo de nuevo? Si el problema persiste, te conectaré con un asesor humano.";

      conversationMemory.addMessage(sessionId, {
        role: "agent",
        content: fallbackResponse,
        timestamp: new Date().toISOString(),
      });

      return {
        phase: "error",
        toolUsed: null,
        response: fallbackResponse,
        error: errMsg,
      };
    }
  },
};

// =============================================
// MANEJADORES DE DECISIÓN (sin reglas de negocio)
// =============================================

const handleDirectResponse = async (
  _context: ConversationContext,
  _sessionId: string,
  content: string
): Promise<AgentTurnResult> => {
  // DeepSeek ya formuló la respuesta. Solo la entregamos.
  await toolbelt.execute("send_response", { text: content });
  return {
    phase: "responding",
    toolUsed: "send_response",
    response: content,
  };
};

const handleToolCall = async (
  context: ConversationContext,
  _sessionId: string,
  toolName: ToolName,
  toolArgs: Record<string, unknown>
): Promise<AgentTurnResult> => {
  context.agentState.currentPhase = "executing";

  // Ejecutar la herramienta que DeepSeek decidió
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = await toolbelt.execute(toolName, toolArgs as any);

  // Construir el resumen del resultado para que DeepSeek formule la respuesta
  const toolResultSummary = buildToolResultSummary(toolName, output);

  // Si la herramienta ya produjo una respuesta final (ej: ask_clarification, handoff_to_human)
  // podemos usarla directamente sin llamar a DeepSeek de nuevo
  if (canUseDirectOutput(toolName)) {
    return buildDirectToolResult(toolName, output, context);
  }

  // Para herramientas que devuelven datos (search_knowledge, get_multimedia),
  // pedimos a DeepSeek que formule la respuesta final
  context.agentState.currentPhase = "formulating";
  const response = await deepseekService.formulateResponse(
    context,
    toolResultSummary
  );

  // Enviar la respuesta
  const attachments = extractAttachments(toolName, output);
  await toolbelt.execute("send_response", { text: response, attachments });

  return {
    phase: "responding",
    toolUsed: toolName,
    response,
    attachments,
  };
};

// =============================================
// HELPERS TÉCNICOS (sin lógica de negocio)
// =============================================

/**
 * Convierte el output de una herramienta en un resumen de texto
 * que DeepSeek pueda usar para formular una respuesta.
 */
const buildToolResultSummary = (
  toolName: ToolName,
  output: unknown
): string => {
  switch (toolName) {
    case "search_knowledge": {
      const data = output as SearchKnowledgeOutput;
      if (data.data.length === 0) return "No se encontró información.";
      return data.data
        .map(
          (item, i) =>
            `[${i + 1}] ${item.title}\n${item.content}\nMetadata: ${JSON.stringify(item.metadata)}`
        )
        .join("\n\n");
    }

    case "get_multimedia": {
      const data = output as GetMultimediaOutput;
      return data.files
        .map((f) => `- ${f.title} (${f.type}): ${f.url}`)
        .join("\n");
    }

    default:
      return JSON.stringify(output);
  }
};

/**
 * Algunas herramientas producen una respuesta final
 * que no necesita ser reformulada por DeepSeek.
 */
const canUseDirectOutput = (toolName: ToolName): boolean => {
  return ["ask_clarification", "handoff_to_human"].includes(
    toolName
  );
};

/**
 * Construye el resultado directamente desde la herramienta
 * cuando no se necesita reformulación de DeepSeek.
 */
const buildDirectToolResult = (
  toolName: ToolName,
  output: unknown,
  context: ConversationContext
): AgentTurnResult => {
  switch (toolName) {
    case "ask_clarification": {
      const data = output as AskClarificationOutput;
      return {
        phase: "responding",
        toolUsed: "ask_clarification",
        response: data.question,
      };
    }

    case "handoff_to_human": {
      const data = output as HandoffToHumanOutput;
      context.agentState.handoffRequested = true;
      return {
        phase: "handoff",
        toolUsed: "handoff_to_human",
        response:
          "Te voy a transferir con un asesor humano que podrá ayudarte mejor. Un momento por favor.",
        handoffReason: data.reason,
      };
    }

    case "mark_ready_to_buy": {
      context.agentState.readyToBuy = true;
      return {
        phase: "responding",
        toolUsed: "mark_ready_to_buy",
        response:
          "¡Excelente! Me alegra que quieras trabajar con nosotros. Te voy a conectar con un asesor para finalizar tu pedido.",
      };
    }

    default:
      return {
        phase: "error",
        toolUsed: toolName,
        response: "Lo siento, no pude procesar tu solicitud.",
      };
  }
};

/**
 * Extrae attachments del output de herramientas que devuelven multimedia.
 */
const extractAttachments = (
  toolName: ToolName,
  output: unknown
): string[] | undefined => {
  if (toolName === "get_multimedia") {
    const data = output as GetMultimediaOutput;
    return data.files.map((f) => f.url);
  }
  return undefined;
};