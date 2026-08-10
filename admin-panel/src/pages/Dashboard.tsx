import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

interface DashboardStats {
  knowledgeCount: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiClient.getApiKey()) {
      setError("Configura la API Key en el botón 🔑 de la barra lateral.");
      return;
    }
    apiClient.knowledge
      .list({ limit: 1 })
      .then((data: { total: number }) =>
        setStats({ knowledgeCount: data.total })
      )
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Knowledge card */}
        <div
          onClick={() => navigate("/knowledge")}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Conocimientos</h3>
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-3xl font-bold text-indigo-600">
            {stats?.knowledgeCount ?? "—"}
          </p>
          <p className="text-sm text-gray-500 mt-1">fragmentos activos</p>
        </div>

        {/* Conversations card (placeholder) */}
        <div
          onClick={() => navigate("/conversations")}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Conversaciones</h3>
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-3xl font-bold text-indigo-600">—</p>
          <p className="text-sm text-gray-500 mt-1">próximamente</p>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Acciones rápidas</h3>
          <button
            onClick={() => navigate("/knowledge")}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            + Nuevo conocimiento
          </button>
          <button
            onClick={() => navigate("/conversations")}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            💬 Ver conversaciones
          </button>
        </div>
      </div>
    </div>
  );
}