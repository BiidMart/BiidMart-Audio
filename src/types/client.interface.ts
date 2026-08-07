export interface Client {
  id: string;
  phone: string;
  name: string | null;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_interaction_at: string;
}

export interface CreateClientDto {
  phone: string;
  name?: string;
  source?: string;
  notes?: string;
}

export interface UpdateClientDto {
  name?: string;
  notes?: string;
}