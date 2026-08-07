export interface Payment {
  id: string;
  client_id: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  notes: string | null;
  paid_at: string;
  created_at: string;
}

export interface CreatePaymentDto {
  client_id?: string;
  phone?: string;
  amount: number;
  currency?: string;
  method?: string;
  notes?: string;
}

export interface PaymentListResponse {
  data: Payment[];
  total: number;
}