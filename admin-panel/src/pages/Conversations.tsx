import { useState } from "react";

// =============================================
// Módulo de Conversaciones — UI (no conectado)
// Se conectará a la API en la siguiente fase.
// =============================================

interface MockMessage {
  id: string;
  role: "client" | "agent" | "admin";
  content: string;
  timestamp: string;
}

interface MockConversation {
  phone: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unread: boolean;
}

// Datos de demostración para la UI
const mockConversations: MockConversation[] = [
  {
    phone: "+573001234567",
    name: "Carlos Mendoza",
    lastMessage: "¿Cuánto cuesta una producción completa?",
    lastTime: "10:32 AM",
    unread: true,
  },
  {
    phone: "+573009876543",
    name: "María López",
    lastMessage: "Me interesa el servicio de mezcla",
    lastTime: "Ayer",
    unread: false,
  },
  {
    phone: "+573001112233",
    name: "Andrés Ruiz",
    lastMessage: "¿Tienen ejemplos de reggaetón?",
    lastTime: "Ayer",
    unread: true,
  },
  {
    phone: "+573004445555",
    name: "Diana Torres",
    lastMessage: "Listo, ¿cómo hago el pago?",
    lastTime: "Hace 2 días",
    unread: false,
  },
];

const mockMessages: MockMessage[] = [
  {
    id: "1",
    role: "client",
    content: "Hola, estoy interesado en producir una canción de reggaetón.",
    timestamp: "10:30 AM",
  },
  {
    id: "2",
    role: "agent",
    content:
      "¡Hola! Soy Mateo, asesor de BiidMart Audio. Claro, el reggaetón es de lo que más trabajamos. ¿Ya tienes la letra y la pista o necesitas producción desde cero?",
    timestamp: "10:31 AM",
  },
  {
    id: "3",
    role: "client",
    content: "Tengo la letra pero necesito la pista y la producción completa.",
    timestamp: "10:32 AM",
  },
  {
    id: "4",
    role: "agent",
    content:
      "Perfecto. La producción completa incluye creación de la pista, grabación, mezcla y mastering. Toma entre 5 y 7 días hábiles. ¿Quieres que te cuente los precios?",
    timestamp: "10:32 AM",
  },
  {
    id: "5",
    role: "client",
    content: "¿Cuánto cuesta una producción completa?",
    timestamp: "10:32 AM",
  },
  {
    id: "6",
    role: "admin",
    content:
      "¡Hola Carlos! Te confirmo que la producción completa tiene un costo de $450.000 COP. Incluye todo el proceso. Si quieres te envío el enlace de pago para el anticipo del 30%.",
    timestamp: "10:35 AM",
  },
];

export default function Conversations() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const selectedConv = mockConversations.find(
    (c) => c.phone === selectedPhone
  );

  const handleSend = () => {
    if (!replyText.trim()) return;
    // En la siguiente fase, esto se conectará al endpoint de respuesta manual
    alert(
      "Respuesta manual se implementará en la siguiente fase.\nMensaje: " +
        replyText
    );
    setReplyText("");
  };

  return (
    <div className="flex h-full">
      {/* Sidebar — Lista de conversaciones */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Conversaciones</h2>
          <input
            type="text"
            placeholder="Buscar conversación..."
            className="w-full mt-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {mockConversations.map((conv) => (
            <div
              key={conv.phone}
              onClick={() => setSelectedPhone(conv.phone)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedPhone === conv.phone ? "bg-indigo-50 border-l-4 border-l-indigo-500" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">{conv.name}</span>
                <span className="text-xs text-gray-400">{conv.lastTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 truncate pr-2">
                  {conv.lastMessage}
                </span>
                {conv.unread && (
                  <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main — Área de chat */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConv ? (
          <>
            {/* Header del chat */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                {selectedConv?.name?.charAt(0) || "?"}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{selectedConv?.name}</h3>
                <p className="text-xs text-gray-400">{selectedConv?.phone}</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mockMessages.map((msg) => (
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
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Campo de respuesta */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Escribir mensaje..."
                  className="flex-1 px-4 py-2.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!replyText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Enviar
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                ⚠️ Respuesta manual — se conectará en la siguiente fase
              </p>
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