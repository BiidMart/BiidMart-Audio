import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { apiClient } from "../api/client";

export default function Layout() {
  const location = useLocation();
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(apiClient.getApiKey());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      apiClient.setApiKey(apiKeyInput.trim());
    } else {
      apiClient.clearApiKey();
    }
    setShowApiModal(false);
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: "📊" },
    { to: "/knowledge", label: "Knowledge", icon: "📚" },
    { to: "/conversations", label: "Conversaciones", icon: "💬" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-gray-900 text-white flex flex-col transition-all duration-200`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {sidebarOpen && (
            <h1 className="text-lg font-bold truncate">BiidMart Admin</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-700 rounded text-sm"
            title="Toggle sidebar"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item.to)
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* API Key button */}
        <div className="p-3 border-t border-gray-700">
          <button
            onClick={() => {
              setApiKeyInput(apiClient.getApiKey());
              setShowApiModal(true);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
              apiClient.getApiKey()
                ? "bg-green-800 text-green-200 hover:bg-green-700"
                : "bg-red-800 text-red-200 hover:bg-red-700"
            }`}
          >
            {sidebarOpen ? (
              <span>🔑 {apiClient.getApiKey() ? "API Key ✓" : "Configurar API Key"}</span>
            ) : (
              <span>🔑</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* API Key Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-lg font-bold mb-4">Configurar API Key</h2>
            <p className="text-sm text-gray-600 mb-3">
              Ingresa la <code className="bg-gray-100 px-1 rounded">ADMIN_API_KEY</code>{" "}
              para autenticar las solicitudes al backend.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="ADMIN_API_KEY..."
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}