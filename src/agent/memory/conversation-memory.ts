// =============================================
// Memoria temporal de conversación
// =============================================
// Almacena el contexto de cada conversación activa en memoria.
// Los datos expiran automáticamente después de 24 horas.
// NO persiste a base de datos.

import {
  ConversationContext,
  Message,
  AgentState,
} from "../agent.types";

interface MemoryEntry {
  context: ConversationContext;
  lastActivity: number;
}

const store = new Map<string, MemoryEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// Limpieza automática cada hora
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, entry] of store.entries()) {
    if (now - entry.lastActivity > TTL_MS) {
      store.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

const createInitialState = (): AgentState => ({
  turnCount: 0,
  lastToolUsed: null,
  lastKnowledgeSearch: null,
  handoffRequested: false,
  readyToBuy: false,
  currentPhase: "idle",
});

export const conversationMemory = {
  getOrCreate: (sessionId: string, clientPhone: string): ConversationContext => {
    const existing = store.get(sessionId);
    if (existing) {
      existing.lastActivity = Date.now();
      return existing.context;
    }

    const context: ConversationContext = {
      sessionId,
      clientPhone,
      messages: [],
      collectedData: {},
      agentState: createInitialState(),
    };

    store.set(sessionId, { context, lastActivity: Date.now() });
    return context;
  },

  get: (sessionId: string): ConversationContext | null => {
    const entry = store.get(sessionId);
    if (!entry) return null;

    if (Date.now() - entry.lastActivity > TTL_MS) {
      store.delete(sessionId);
      return null;
    }

    entry.lastActivity = Date.now();
    return entry.context;
  },

  addMessage: (sessionId: string, message: Message): void => {
    const context = conversationMemory.get(sessionId);
    if (context) {
      context.messages.push(message);
    }
  },

  updateAgentState: (
    sessionId: string,
    partial: Partial<AgentState>
  ): void => {
    const context = conversationMemory.get(sessionId);
    if (context) {
      Object.assign(context.agentState, partial);
    }
  },

  updateCollectedData: (
    sessionId: string,
    data: Record<string, unknown>
  ): void => {
    const context = conversationMemory.get(sessionId);
    if (context) {
      Object.assign(context.collectedData, data);
    }
  },

  delete: (sessionId: string): void => {
    store.delete(sessionId);
  },

  /**
   * Lista todas las sesiones activas con un resumen de su último mensaje.
   * No expone el Map interno; solo devuelve datos seguros para el Admin Panel.
   */
  getAll: (): Array<{
    sessionId: string;
    clientPhone: string;
    lastMessage: string | null;
    lastActivity: number;
  }> => {
    const now = Date.now();
    const sessions: Array<{
      sessionId: string;
      clientPhone: string;
      lastMessage: string | null;
      lastActivity: number;
    }> = [];

    for (const [sessionId, entry] of store.entries()) {
      // Omitir entradas expiradas (la limpieza corre cada hora, pero por si acaso)
      if (now - entry.lastActivity > TTL_MS) {
        store.delete(sessionId);
        continue;
      }

      const { context } = entry;
      const lastMsg = context.messages[context.messages.length - 1];

      sessions.push({
        sessionId,
        clientPhone: context.clientPhone,
        lastMessage: lastMsg ? lastMsg.content : null,
        lastActivity: entry.lastActivity,
      });
    }

    // Ordenar por actividad más reciente primero
    sessions.sort((a, b) => b.lastActivity - a.lastActivity);

    return sessions;
  },
};
