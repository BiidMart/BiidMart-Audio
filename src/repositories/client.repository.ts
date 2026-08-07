import { getPool } from "../config/database";
import { Client, CreateClientDto, UpdateClientDto } from "../types/client.interface";

export const clientRepository = {
  create: async (dto: CreateClientDto): Promise<Client> => {
    const { rows } = await getPool().query(
      `INSERT INTO clients (phone, name, source, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, clients.name),
         last_interaction_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [dto.phone, dto.name || null, dto.source || "whatsapp", dto.notes || null]
    );
    return rows[0];
  },

  findByPhone: async (phone: string): Promise<Client | null> => {
    const { rows } = await getPool().query(
      "SELECT * FROM clients WHERE phone = $1",
      [phone]
    );
    return rows[0] || null;
  },

  findById: async (id: string): Promise<Client | null> => {
    const { rows } = await getPool().query(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  },

  findAll: async (): Promise<Client[]> => {
    const { rows } = await getPool().query(
      "SELECT * FROM clients ORDER BY last_interaction_at DESC"
    );
    return rows;
  },

  update: async (id: string, dto: UpdateClientDto): Promise<Client | null> => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      sets.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.notes !== undefined) {
      sets.push(`notes = $${paramIndex++}`);
      values.push(dto.notes);
    }

    if (sets.length === 0) return clientRepository.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await getPool().query(
      `UPDATE clients SET ${sets.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  touchInteraction: async (phone: string): Promise<void> => {
    await getPool().query(
      "UPDATE clients SET last_interaction_at = NOW() WHERE phone = $1",
      [phone]
    );
  },
};