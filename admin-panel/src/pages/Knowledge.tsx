import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../api/client";
import type { Knowledge as KnowledgeType, Category } from "../types";
import { CATEGORIES } from "../types";

const emptyForm = {
  title: "",
  content: "",
  category: "general" as Category,
  tags: "" as string,
};

export default function Knowledge() {
  const [items, setItems] = useState<KnowledgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let data: unknown;
      if (searchQuery.trim()) {
        data = await apiClient.knowledge.search(
          searchQuery.trim(),
          filterCategory || undefined
        );
      } else {
        data = await apiClient.knowledge.list({ limit: 100, includeInactive: showInactive });
      }
      setItems((data as { data: KnowledgeType[] }).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, showInactive]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      setSaving(true);
      await apiClient.knowledge.create({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setShowForm(false);
      setForm(emptyForm);
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !form.title.trim() || !form.content.trim()) return;
    try {
      setSaving(true);
      await apiClient.knowledge.update(editingId, {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: KnowledgeType) => {
    try {
      await apiClient.knowledge.update(item.id, {
        is_active: !item.is_active,
      });
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar permanentemente este conocimiento?")) return;
    try {
      await apiClient.knowledge.remove(id);
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const openEdit = (item: KnowledgeType) => {
    setForm({
      title: item.title,
      content: item.content,
      category: item.category as Category,
      tags: (item.tags || []).join(", "),
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Knowledge / Conocimiento</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar desactivados
          </label>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Nuevo conocimiento
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar conocimiento..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Items list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No se encontraron conocimientos.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-lg border p-4 transition-colors ${
                item.is_active ? "border-gray-200" : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {item.title}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                      {item.category}
                    </span>
                    {!item.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {item.content}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDate(item.updated_at)}</span>
                    {item.tags?.length > 0 && (
                      <span className="flex gap-1">
                        {item.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-gray-100 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 transition-colors"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  {item.is_active ? (
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 transition-colors"
                      title="Desactivar"
                    >
                      👁️
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium"
                      title="Reactivar"
                    >
                      🔄 Reactivar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-12 overflow-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl animate-fade-in mb-12">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? "Editar conocimiento" : "Nuevo conocimiento"}
            </h2>

            {/* Title */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Precio producción musical completa"
            />

            {/* Category */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as Category })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Tags */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (separados por coma)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="precio, produccion, completo"
            />

            {/* Content */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenido *
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              placeholder="Contenido del conocimiento. Información concreta y clara que Mateo usará para responder."
            />

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={
                  saving || !form.title.trim() || !form.content.trim()
                }
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Actualizar"
                    : "Guardar conocimiento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}