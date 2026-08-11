// =============================================
// Tipos del Agente IA
// =============================================

import { ToolName } from "./tool.types";

// Estados del Agente durante el ciclo de pensamiento
export type AgentPhase =
  | "idle"          // Sin conversación activa
  | "analyzing"     // Analizando el mensaje del cliente
  | "deciding"      // Decidiendo qué herramienta usar
  | "executing"     // Ejecutando herramienta
  | "formulating"   // Formulando respuesta
  | "responding"    // Enviando respuesta
  | "handoff"       // Derivando al humano
  | "error";        // Error en el ciclo

// Mensaje del cliente o del agente
export interface Message {
  role: "client" | "agent";
  content: string;
  timestamp: string;
}

// Datos recolectados del cliente durante la conversación
export interface CollectedClientData {
  genre?: string;
  name?: string;
  budget?: string;
  projectType?: string;
}

// Estado interno del Agente
export interface AgentState {
  turnCount: number;
  lastToolUsed: ToolName | null;
  lastKnowledgeSearch: string | null;
  handoffRequested: boolean;
  readyToBuy: boolean;
  currentPhase: AgentPhase;
}

// Contexto completo de una conversación (memoria temporal)
export interface ConversationContext {
  sessionId: string;
  clientPhone: string;
  messages: Message[];
  collectedData: CollectedClientData;
  agentState: AgentState;
}

// Resultado del ciclo de pensamiento
export interface AgentTurnResult {
  phase: AgentPhase;
  toolUsed: ToolName | null;
  response: string;
  description?: string | null;
  attachments?: { url: string; display_name: string }[];
  handoffReason?: string;
  error?: string;
}
