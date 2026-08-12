// =============================================
// Cliente HTTP para el Panel Administrativo
// Usa ADMIN_API_KEY configurada en localStorage
// =============================================

const BASE_URL = "/api";

const getHeaders = (): Record<string, string> => {
  const apiKey = localStorage.getItem("admin_api_key") || "";
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ||
        `Error ${res.status}`
    );
  }
  if (res.status === 204) return null;
  return res.json();
};

export const apiClient = {
  // ─── Auth ───
  setApiKey: (key: string) => localStorage.setItem("admin_api_key", key),
  getApiKey: (): string => localStorage.getItem("admin_api_key") || "",
  clearApiKey: () => localStorage.removeItem("admin_api_key"),

  // ─── Knowledge CRUD ───
  knowledge: {
    list: (params?: { limit?: number; offset?: number; includeInactive?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));
      if (params?.includeInactive) query.set("includeInactive", "true");
      const qs = query.toString();
      return fetch(`${BASE_URL}/knowledge${qs ? `?${qs}` : ""}`, {
        headers: getHeaders(),
      }).then(handleResponse);
    },

    search: (query: string, category?: string) => {
      const params = new URLSearchParams({ query, limit: "20" });
      if (category) params.set("category", category);
      return fetch(`${BASE_URL}/knowledge/search?${params}`, {
        headers: getHeaders(),
      }).then(handleResponse);
    },

    getById: (id: string) =>
      fetch(`${BASE_URL}/knowledge/${id}`, {
        headers: getHeaders(),
      }).then(handleResponse),

    create: (data: Record<string, unknown>) =>
      fetch(`${BASE_URL}/knowledge`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse),

    update: (id: string, data: Record<string, unknown>) =>
      fetch(`${BASE_URL}/knowledge/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse),

    remove: (id: string) =>
      fetch(`${BASE_URL}/knowledge/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // ─── Resources CRUD ───
  resources: {
    list: (includeInactive = false) => {
      const qs = includeInactive ? "?includeInactive=true" : "";
      return fetch(`${BASE_URL}/resources${qs}`, {
        headers: getHeaders(),
      }).then(handleResponse);
    },

    getById: (id: string) =>
      fetch(`${BASE_URL}/resources/${id}`, {
        headers: getHeaders(),
      }).then(handleResponse),

    create: (data: Record<string, unknown>) =>
      fetch(`${BASE_URL}/resources`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse),

    update: (id: string, data: Record<string, unknown>) =>
      fetch(`${BASE_URL}/resources/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse),

    remove: (id: string) =>
      fetch(`${BASE_URL}/resources/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      }).then(handleResponse),

    // ─── Files ───
    uploadFile: (resourceId: string, file: File, displayName: string, role = "file", sortOrder = 0) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("display_name", displayName);
      formData.append("role", role);
      formData.append("sort_order", String(sortOrder));
      const apiKey = localStorage.getItem("admin_api_key") || "";
      return fetch(`${BASE_URL}/resources/${resourceId}/files`, {
        method: "POST",
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        body: formData,
      }).then(handleResponse);
    },

    deleteFile: (resourceId: string, fileId: string) =>
      fetch(`${BASE_URL}/resources/${resourceId}/files/${fileId}`, {
        method: "DELETE",
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // ─── Conversations (Admin Chat) ───
  conversations: {
    list: () =>
      fetch(`${BASE_URL}/admin/conversations`, {
        headers: getHeaders(),
      }).then(handleResponse),

    getMessages: (phone: string) =>
      fetch(`${BASE_URL}/admin/conversations/${encodeURIComponent(phone)}/messages`, {
        headers: getHeaders(),
      }).then(handleResponse),

    reply: (phone: string, message: string) =>
      fetch(`${BASE_URL}/admin/conversations/${encodeURIComponent(phone)}/reply`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message }),
      }).then(handleResponse),

    remove: (id: string) =>
      fetch(`${BASE_URL}/admin/conversations/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: getHeaders(),
      }).then(handleResponse),
  },
};
