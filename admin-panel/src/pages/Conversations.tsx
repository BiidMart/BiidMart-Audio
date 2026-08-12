import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";

// =============================================
// Módulo de Conversaciones — conectado a la API real
// =============================================

interface Message {
  id: string;
  role: "client" | "agent" | "admin";
  content: string;
  timestamp: string;
}

interface Conversation {
  phone: string;
  name: string;
  lastMessage: string | null;
  lastActivity: number;
}

interface ApiMessage {
  role: "client" | "agent" | "admin";
  content: string;
  timestamp: string;
}

const formatTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
};

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");

  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar lista de conversaciones
  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const data = (await apiClient.conversations.list()) as {
        conversations: Conversation[];
      };
      setConversations(data.conversations || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar conversaciones"
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Cargar mensajes de la conversación seleccionada
  const loadMessages = useCallback(async (phone: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const data = (await apiClient.conversations.getMessages(phone)) as {
        messages: ApiMessage[];
      };
      setMessages(
        (data.messages || []).map((msg, index) => ({
          id: `${phone}-${index}-${msg.timestamp}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los mensajes"
      );
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone);
    } else {
      setMessages([]);
    }
  }, [selectedPhone, loadMessages]);

  const handleSelect = (phone: string) => {
    setSelectedPhone(phone);
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selectedPhone) return;

    setSending(true);
    setError(null);
    try {
      const result = (await apiClient.conversations.reply(
        selectedPhone,
        replyText.trim()
      )) as { message: ApiMessage };

      // Agregar el mensaje del admin a la vista local
      const sentMessage = result.message;
      setMessages((prev) => [
        ...prev,
        {
          id: `${selectedPhone}-${Date.now()}`,
          role: sentMessage.role,
          content: sentMessage.content,
          timestamp: sentMessage.timestamp,
        },
      ]);

      setReplyText("");
      // Refrescar la lista para actualizar el último mensaje
      loadConversations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al enviar el mensaje"
      );
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find(
    (c) => c.phone === selectedPhone
  );

  return (
    <div className="flex h-full">
      {/* Sidebar — Lista de conversaciones */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Conversaciones</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="p-4 text-sm text-gray-400">Cargando...</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">
              No hay conversaciones activas.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.phone}
                onClick={() => handleSelect(conv.phone)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedPhone === conv.phone
                    ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate">
                    {conv.name}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {conv.lastActivity
                      ? new Date(conv.lastActivity).toLocaleDateString("es-CO")
                      : ""}
                  </span>
                </div>
                <span className="text-xs text-gray-500 truncate block">
                  {conv.lastMessage || "Sin mensajes aún"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main — Área de chat */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {error && (
          <div className="p-2 bg-red-50 border-b border-red-200 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {selectedConv ? (
          <>
            {/* Header del chat */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                {selectedConv.name?.charAt(0) || "?"}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{selectedConv.name}</h3>
                <p className="text-xs text-gray-400">{selectedConv.phone}</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <p className="text-sm text-gray-400 text-center">
                  Cargando mensajes...
                </p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center">
                  No hay mensajes en esta conversación.
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "client" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                        msg.role === "client"
                          ? "bg-white border border-gray-200 rounded-bl-sm"
                          : msg.role === "admin"
                            ? "bg-green-100 border border-green-300 text-green-900 rounded-br-sm"
                            : "bg-indigo-100 text-indigo-900 rounded-br-sm"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className="text-xs text-gray-400 mt-1 text-right">
                        {msg.role === "client"
                          ? "Cliente"
                          : msg.role === "admin"
                            ? "Tú (admin)"
                            : "Mateo"}
                        {" · "}
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Campo de respuesta */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !sending) {
                      handleSend();
                    }
                  }}
                  placeholder="Escribir mensaje..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!replyText.trim() || sending}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-lg font-medium">Selecciona una conversación</p>
              <p className="text-sm mt-1">
                Elige una conversación de la lista para ver los mensajes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}