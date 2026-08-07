import { clientRepository } from "../repositories/client.repository";
import { Client, UpdateClientDto } from "../types/client.interface";

export const clientService = {
  getOrCreate: async (phone: string, name?: string): Promise<Client> => {
    const existing = await clientRepository.findByPhone(phone);
    if (existing) {
      await clientRepository.touchInteraction(phone);
      if (name && !existing.name) {
        return (await clientRepository.update(existing.id, { name })) || existing;
      }
      return existing;
    }
    return clientRepository.create({ phone, name, source: "whatsapp" });
  },

  findAll: async (): Promise<Client[]> => {
    return clientRepository.findAll();
  },

  findById: async (id: string): Promise<Client | null> => {
    return clientRepository.findById(id);
  },

  findByPhone: async (phone: string): Promise<Client | null> => {
    return clientRepository.findByPhone(phone);
  },

  update: async (id: string, dto: UpdateClientDto): Promise<Client | null> => {
    return clientRepository.update(id, dto);
  },
};