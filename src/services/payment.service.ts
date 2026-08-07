import { paymentRepository } from "../repositories/payment.repository";
import { Payment, CreatePaymentDto, PaymentListResponse } from "../types/payment.interface";

export const paymentService = {
  create: async (dto: CreatePaymentDto): Promise<Payment> => {
    return paymentRepository.create(dto);
  },

  findAll: async (): Promise<PaymentListResponse> => {
    return paymentRepository.findAll();
  },

  findByClient: async (clientId: string): Promise<Payment[]> => {
    return paymentRepository.findByClient(clientId);
  },
};