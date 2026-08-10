import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "../api/client";
import { CATEGORIES } from "../types";

interface ResourceFile {
  id: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  display_name: string;
  sort_order: number;
  role: string;
  created_at: string;
}

interface ResourceItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  knowledge_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  files?: ResourceFile[];
}

const emptyForm = {
  title: "",
  description: "",
  category: "general",
  tags: "",
};

const ROLES = ["file", "original", "result", "demo", "document", "reference"];

export default function Resources() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ResourceItem | null>(null);

  // ─── Carga de datos ───

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.resources.list(showInactive);
      setItems((data as { data: ResourceItem[] }).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const loadDetail = async (id: string) => {
    try {
      const data = await apiClient.resources.getById(id);
      setDetail(data as ResourceItem);
      setDetailId(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  // ─── CRUD ───

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    try {
      setSaving(true);
      await apiClient.resources.create({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
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
    if (!editingId || !form.title.trim()) return;
    try {
      setSaving(true);
      await apiClient.resources.update(editingId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadItems();
      if (detailId) await loadDetail(detailId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: ResourceItem) => {
    try {
      await apiClient.resources.update(item.id, { is_active: !item.is_active });
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar permanentemente este recurso y sus archivos?")) return;
    try {
      await apiClient.resources.remove(id);
      if (detailId === id) { setDetailId(null); setDetail(null); }
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  // ─── Archivos ───

  const handleDeleteFile = async (resourceId: string, fileId: string) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    try {
      await apiClient.resources.deleteFile(resourceId, fileId);
      await loadDetail(resourceId);
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar archivo");
    }
  };

  // ─── Helpers ───

  const openEdit = (item: ResourceItem) => {
    setForm({
      title: item.title,
      description: item.description || "",
      category: item.category,
      tags: (item.tags || []).join(", "),
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // ─── Render ───

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Recursos</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar inactivos
          </label>
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Nuevo recurso
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 text-sm">{error}</div>}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No se encontraron recursos.</div>
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
                    <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">{item.category}</span>
                    {!item.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">Inactivo</span>}
                  </div>
                  {item.description && <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDate(item.updated_at)}</span>
                    {item.tags?.length > 0 && item.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded">{tag}</span>
                    ))}
                    {item.files && item.files.length > 0 && (
                      <span className="text-indigo-600 font-medium">{item.files.length} archivo(s)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => loadDetail(item.id)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 transition-colors" title="Ver archivos">📁</button>
                  <button onClick={() => openEdit(item)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 transition-colors" title="Editar">✏️</button>
                  {item.is_active ? (
                    <button onClick={() => handleToggle(item)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 transition-colors" title="Desactivar">👁️</button>
                  ) : (
                    <button onClick={() => handleToggle(item)} className="px-3 py-1.5 text-xs rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium" title="Reactivar">🔄 Reactivar</button>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear / Editar recurso */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-12 overflow-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl animate-fade-in mb-12">
            <h2 className="text-lg font-bold mb-4">{editingId ? "Editar recurso" : "Nuevo recurso"}</h2>

            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Ejemplo de clonación de voz" />

            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              placeholder="Descripción opcional del recurso" />

            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separados por coma)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ejemplo, clonacion, voz" />

            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">Cancelar</button>
              <button onClick={editingId ? handleUpdate : handleCreate}
                disabled={saving || !form.title.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar recurso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: Detalle de recurso (archivos) */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-12 overflow-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl animate-fade-in mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{detail.title}</h2>
              <button onClick={() => { setDetailId(null); setDetail(null); }}
                className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50">Cerrar</button>
            </div>

            <p className="text-sm text-gray-600 mb-1"><strong>Categoría:</strong> {detail.category}</p>
            {detail.description && <p className="text-sm text-gray-600 mb-3">{detail.description}</p>}

            {/* Archivos existentes */}
            <h3 className="font-semibold text-sm text-gray-700 mb-2 mt-4">
              Archivos {detail.files && detail.files.length > 0 ? `(${detail.files.length})` : ""}
            </h3>
            {detail.files && detail.files.length > 0 ? (
              <div className="space-y-2 mb-4">
                {detail.files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.display_name}</p>
                      <p className="text-xs text-gray-400">{f.file_type} · {formatBytes(f.file_size)} · {f.role}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 text-xs rounded border hover:bg-gray-100 transition-colors">🔗</a>
                      <button onClick={() => handleDeleteFile(detail.id, f.id)}
                        className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">Sin archivos.</p>
            )}

            {/* Agregar archivo: botón toggle + formulario colapsable */}
            <div className="border-t pt-4">
              <FileUploadSection resourceId={detail.id} onFileUploaded={() => { loadDetail(detail.id); loadItems(); }} />
            </div>

            <div className="mt-4 pt-3 border-t flex justify-between">
              <button onClick={() => handleDelete(detail.id)}
                className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                🗑️ Eliminar recurso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-componente: sección colapsable para agregar archivos
function FileUploadSection({ resourceId, onFileUploaded }: { resourceId: string; onFileUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("file");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = displayName.trim();
    if (!name) {
      setError("Debes colocar un nombre para el archivo antes de subirlo.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError("");
    apiClient.resources
      .uploadFile(resourceId, file, name, role)
      .then(() => {
        // Limpiar nombre y resetear input después de subida exitosa
        setDisplayName("");
        setRole("file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        onFileUploaded();
      })
      .catch((err: Error) => {
        setError(err.message || "Error al subir archivo");
        // NO limpiar el nombre ni el archivo en caso de error — permitir reintentar
      });
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        + Agregar archivo
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Agregar archivo</span>
        <button onClick={() => { setOpen(false); setError(""); }} className="text-xs text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelected}
        />
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre visible</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Audio original del cliente" />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button
          onClick={handleClickUpload}
          className="px-4 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 transition-colors shrink-0">
          Subir archivo
        </button>
      </div>
    </div>
  );
}
