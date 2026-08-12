// =============================================
// Tipos del Chat de Conversaciones (persistencia)
// =============================================

export interface Conversation {
  id: string;
  phone: string;
  client_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export type MessageRole = "client" | "agent" | "admin";

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  media_type: string | null;
  media_url: string | null;
  media_path: string | null;
  media_expires_at: string | null;
  created_at: string;
}

export interface ConversationListItem {
  id: string;
  phone: string;
  name: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
}

export interface ConversationMessageDto {
  id: string;
  role: MessageRole;
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  mediaExpired: boolean;
  createdAt: string;
}

export interface UpsertMessageDto {
  phone: string;
  role: MessageRole;
  content: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  mediaPath?: string | null;
  mediaExpiresAt?: string | null;
}