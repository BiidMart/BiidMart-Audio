import { knowledgeRepository } from "../repositories/knowledge.repository";
import {
  Knowledge,
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  SearchKnowledgeDto,
  KnowledgeListResponse,
} from "../types/knowledge.interface";

export const knowledgeService = {
  create: async (dto: CreateKnowledgeDto): Promise<Knowledge> => {
    return knowledgeRepository.create(dto);
  },

  findAll: async (limit?: number, offset?: number): Promise<KnowledgeListResponse> => {
    return knowledgeRepository.findAll(limit, offset);
  },

  findById: async (id: string): Promise<Knowledge | null> => {
    return knowledgeRepository.findById(id);
  },

  update: async (id: string, dto: UpdateKnowledgeDto): Promise<Knowledge | null> => {
    return knowledgeRepository.update(id, dto);
  },

  delete: async (id: string): Promise<boolean> => {
    return knowledgeRepository.delete(id);
  },

  search: async (dto: SearchKnowledgeDto): Promise<KnowledgeListResponse> => {
    return knowledgeRepository.search(dto);
  },

  findByCategory: async (category: string): Promise<Knowledge[]> => {
    return knowledgeRepository.findByCategory(category);
  },

  findByContentType: async (contentType: string): Promise<Knowledge[]> => {
    return knowledgeRepository.findByContentType(contentType);
  },
};