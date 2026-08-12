// =============================================
// Tipos para WhatsApp Cloud API
// =============================================

// Mensaje entrante desde el webhook de Meta
export interface WhatsAppIncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: "text" | "audio" | "image" | "video" | "document" | "unsupported";
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; filename: string; sha256: string };
}

export interface WhatsAppContact {
  wa_id: string;
  profile: { name: string };
}

export interface WhatsAppStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

export interface WhatsAppWebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  messages?: WhatsAppIncomingMessage[];
  contacts?: WhatsAppContact[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

// Mensaje parseado para uso interno
export interface ParsedIncomingMessage {
  phone: string;
  message: string;
  messageId: string;
  type: string;
  /** ID del archivo multimedia (audio/image/video/document) si aplica. */
  mediaId?: string | null;
  /** MIME type del archivo multimedia si aplica. */
  mimeType?: string | null;
}

// Tipos de mensaje saliente
export type WhatsAppOutgoingType =
  | "text"
  | "audio"
  | "image"
  | "video"
  | "document";

export interface WhatsAppTextPayload {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: { body: string; preview_url: boolean };
}

export interface WhatsAppMediaPayload {
  messaging_product: "whatsapp";
  to: string;
  type: "audio" | "image" | "video" | "document";
  [key: string]: unknown;
}

export type WhatsAppOutgoingPayload =
  | WhatsAppTextPayload
  | WhatsAppMediaPayload;

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export interface WhatsAppApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_data?: { details: string };
  };
}