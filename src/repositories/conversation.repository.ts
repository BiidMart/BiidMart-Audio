// =============================================
// Conversation Repository
// Acceso a datos de conversations y conversation_messages.
// =============================================

import { getPool } from "../config/database";
import {
  Conversation,
  ConversationMessage,
  ConversationListItem,
  MessageRole,
} from "../types/conversation.interface";

interface AddMessageInput {
  role: MessageRole;
  content: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  mediaPath?: string | null;
  mediaExpiresAt?: string | null;
}

export const conversationRepository = {
  findOrCreateByPhone: async (phone: string): Promise<Conversation> => {
    const { rows } = await getPool().query(
      `INSERT INTO conversations (phone)
       VALUES ($1)
       ON CONFLICT (phone) DO UPDATE SET
         updated_at = NOW()
       RETURNING *`,
      [phone]
    );
    return rows[0];
  },

  findByPhone: async (phone: string): Promise<Conversation | null> => {
    const { rows } = await getPool().query(
      "SELECT * FROM conversations WHERE phone = $1",
      [phone]
    );
    return rows[0] || null;
  },

  addMessage: async (
    conversationId: string,
    input: AddMessageInput
  ): Promise<ConversationMessage> => {
    const { rows } = await getPool().query(
      `INSERT INTO conversation_messages
         (conversation_id, role, content, media_type, media_url, media_path, media_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        conversationId,
        input.role,
        input.content,
        input.mediaType ?? null,
        input.mediaUrl ?? null,
        input.mediaPath ?? null,
        input.mediaExpiresAt ?? null,
      ]
    );
    return rows[0];
  },

  touchLastMessage: async (
    conversationId: string,
    createdAt: string
  ): Promise<void> => {
    await getPool().query(
      "UPDATE conversations SET last_message_at = $2, updated_at = NOW() WHERE id = $1",
      [conversationId, createdAt]
    );
  },

  listConversations: async (): Promise<ConversationListItem[]> => {
    const { rows } = await getPool().query(
      `SELECT
         c.id,
         c.phone,
         cl.name AS name,
         c.last_message_at AS "lastMessageAt",
         c.taken_by_admin AS "takenByAdmin",
         (
           SELECT cm.content
           FROM conversation_messages cm
           WHERE cm.conversation_id = c.id
           ORDER BY cm.created_at DESC
           LIMIT 1
         ) AS "lastMessage"
       FROM conversations c
       LEFT JOIN clients cl ON cl.id = c.client_id
       ORDER BY c.last_message_at DESC`
    );
    return rows;
  },

  getMessagesById: async (
    conversationId: string
  ): Promise<ConversationMessage[]> => {
    const { rows } = await getPool().query(
      "SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [conversationId]
    );
    return rows;
  },

  getMediaPaths: async (conversationId: string): Promise<string[]> => {
    const { rows } = await getPool().query(
      "SELECT media_path FROM conversation_messages WHERE conversation_id = $1 AND media_path IS NOT NULL",
      [conversationId]
    );
    return rows.map((r) => r.media_path as string);
  },

  deleteById: async (id: string): Promise<boolean> => {
    const { rowCount } = await getPool().query(
      "DELETE FROM conversations WHERE id = $1",
      [id]
    );
    return (rowCount ?? 0) > 0;
  },

  findExpiredMediaPaths: async (now: string): Promise<string[]> => {
    const { rows } = await getPool().query(
      `SELECT media_path
       FROM conversation_messages
       WHERE media_expires_at IS NOT NULL
         AND media_path IS NOT NULL
         AND media_expires_at <= $1
       LIMIT 100`,
      [now]
    );
    return rows.map((r) => r.media_path as string);
  },

  clearExpiredMedia: async (now: string): Promise<number> => {
    const { rowCount } = await getPool().query(
      `UPDATE conversation_messages
       SET media_url = NULL, media_path = NULL
       WHERE media_expires_at IS NOT NULL
         AND media_path IS NOT NULL
         AND media_expires_at <= $1`,
      [now]
    );
    return rowCount ?? 0;
  },

  // Establece la relación de la conversación con el cliente registrado en BD.
  linkClient: async (phone: string, clientId: string): Promise<void> => {
    await getPool().query(
      "UPDATE conversations SET client_id = $2, updated_at = NOW() WHERE phone = $1 AND client_id IS NULL",
      [phone, clientId]
    );
  },

  // Indica si la conversación (por teléfono) está tomada por un administrador.
  // Devuelve false si no existe la conversación, para no bloquear al agente.
  isTakenByPhone: async (phone: string): Promise<boolean> => {
    const { rows } = await getPool().query(
      "SELECT taken_by_admin FROM conversations WHERE phone = $1",
      [phone]
    );
    if (rows.length === 0) return false;
    return Boolean(rows[0].taken_by_admin);
  },

  // Activa/desactiva el estado "tomado por admin" de una conversación.
  setTakenById: async (id: string, taken: boolean): Promise<boolean> => {
    const { rowCount } = await getPool().query(
      "UPDATE conversations SET taken_by_admin = $2, updated_at = NOW() WHERE id = $1",
      [id, taken]
    );
    return (rowCount ?? 0) > 0;
  },
};
