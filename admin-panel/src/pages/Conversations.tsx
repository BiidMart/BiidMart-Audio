import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";

// =============================================
// Módulo de Conversaciones — conectado a BD (persistente)
// =============================================

interface Message {
  id: string;
  role: "client" | "agent" | "admin";
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  mediaExpired: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  phone: string;
  name: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
}

interface ApiMessage {
  id: string;
  role: "client" | "agent" | "admin";
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  mediaExpired: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 4000;

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

const formatDate = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-CO");
  } catch {
    return "";
  }
};

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");

  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRef = useRef<{ phone: string | null }>({ phone: null });

  // Cargar lista de conversaciones
  const loadConversations = useCallback(async () => {
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

  // Cargar mensajes de la conversación seleccionada.
  // `silent` evita mostrar el indicador de carga en refrescos por polling.
  const loadMessages = useCallback(async (phone: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const data = (await apiClient.conversations.getMessages(phone)) as {
        messages: ApiMessage[];
      };
      setMessages(data.messages || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los mensajes"
      );
      setMessages([]);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Al seleccionar una conversación, cargar sus mensajes
  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone);
    } else {
      setMessages([]);
    }
  }, [selectedPhone, loadMessages]);

  // Polling: refresca la lista y los mensajes de la conversación activa.
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      if (selectedRef.current.phone) {
        // Refresco silencioso: no parpadea el área de mensajes.
        loadMessages(selectedRef.current.phone, true);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loadConversations, loadMessages]);

  const handleSelect = (conv: Conversation) => {
    setSelectedId(conv.id);
    setSelectedPhone(conv.phone);
    selectedRef.current.phone = conv.phone;
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selectedPhone) return;

    setSending(true);
    setError(null);
    try {
      const result = (await apiClient.conversations.reply(
        selectedPhone,
        replyText.trim()
      )) as { message: { role: string; content: string; timestamp: string } };

      const sentMessage = result.message;
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: sentMessage.role as Message["role"],
          content: sentMessage.content,
          mediaType: null,
          mediaUrl: null,
          mediaExpired: false,
          createdAt: sentMessage.timestamp,
        },
      ]);

      setReplyText("");
      loadConversations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al enviar el mensaje"
      );
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const confirmed = window.confirm(
      "¿Eliminar esta conversación? Se borrarán todos los mensajes y archivos asociados de forma definitiva."
    );
    if (!confirmed) return;

    setError(null);
    try {
      await apiClient.conversations.remove(selectedId);
      setSelectedId(null);
      setSelectedPhone(null);
      selectedRef.current.phone = null;
      setMessages([]);
      loadConversations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar la conversación"
      );
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al descargar el archivo"
      );
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId);

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
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedId === conv.id
                    ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate">
                    {conv.name || conv.phone}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDate(conv.lastMessageAt)}
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
                {(selectedConv.name || selectedConv.phone)?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {selectedConv.name || selectedConv.phone}
                </h3>
                <p className="text-xs text-gray-400">{selectedConv.phone}</p>
              </div>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Eliminar
              </button>
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
                      {msg.content && <p>{msg.content}</p>}

                      {msg.mediaType === "audio" && (
                        <div className="mt-1">
                          {msg.mediaExpired || !msg.mediaUrl ? (
                            <p className="text-xs italic opacity-70">
                              🔊 Audio expirado
                            </p>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <audio controls src={msg.mediaUrl} className="w-full max-w-sm" />
                              <button
                                onClick={() => handleDownload(msg.mediaUrl as string, "audio.wav")}
                                className="text-xs underline text-indigo-600 text-left"
                              >
                                ⬇ Descargar audio
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.mediaType === "image" && msg.mediaUrl && (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline block mt-1"
                        >
                          🖼 Ver imagen
                        </a>
                      )}

                      {msg.mediaType === "video" && msg.mediaUrl && (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline block mt-1"
                        >
                          🎬 Ver video
                        </a>
                      )}

                      {msg.mediaType === "file" && msg.mediaUrl && (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline block mt-1"
                        >
                          📎 Ver archivo
                        </a>
                      )}

                      <p className="text-xs text-gray-400 mt-1 text-right">
                        {msg.role === "client"
                          ? "Cliente"
                          : msg.role === "admin"
                            ? "Tú (admin)"
                            : "Mateo"}
                        {" · "}
                        {formatTime(msg.createdAt)}
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