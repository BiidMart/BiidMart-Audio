import { getPool } from "../config/database";
import { Payment, CreatePaymentDto, PaymentListResponse } from "../types/payment.interface";
import { clientRepository } from "./client.repository";

export const paymentRepository = {
  create: async (dto: CreatePaymentDto): Promise<Payment> => {
    // Si se proporciona phone en lugar de client_id, buscar el cliente
    let clientId = dto.client_id || null;
    if (!clientId && dto.phone) {
      const client = await clientRepository.findByPhone(dto.phone);
      clientId = client?.id || null;
    }

    const { rows } = await getPool().query(
      `INSERT INTO payments (client_id, amount, currency, method, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clientId, dto.amount, dto.currency || "USD", dto.method || "manual", dto.notes || null]
    );
    return rows[0];
  },

  findAll: async (): Promise<PaymentListResponse> => {
    const { rows: data } = await getPool().query(
      "SELECT * FROM payments ORDER BY created_at DESC"
    );
    return { data, total: data.length };
  },

  findByClient: async (clientId: string): Promise<Payment[]> => {
    const { rows } = await getPool().query(
      "SELECT * FROM payments WHERE client_id = $1 ORDER BY created_at DESC",
      [clientId]
    );
    return rows;
  },
};