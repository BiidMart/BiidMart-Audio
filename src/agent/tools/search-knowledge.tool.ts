// =============================================
// Herramienta: search_knowledge
// Busca fragmentos de conocimiento en el Motor
// =============================================

import { knowledgeService } from "../../services/knowledge.service";
import {
  ToolDefinition,
  SearchKnowledgeInput,
  SearchKnowledgeOutput,
} from "../tool.types";

export const searchKnowledgeTool: ToolDefinition<
  SearchKnowledgeInput,
  SearchKnowledgeOutput
> = {
  name: "search_knowledge",
  description:
    "Busca información en el Motor de Conocimiento del negocio. Úsala cuando el cliente pregunte sobre precios, procesos, ejemplos, pagos, requisitos o cualquier información del negocio.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Texto de búsqueda" },
      category: {
        type: "string",
        description: "Categoría: pricing, process, examples, payments, faq, general, requirements, delivery",
      },
      content_type: {
        type: "string",
        description: "Tipo: text, audio_sample, image, video, file",
      },
    },
    required: ["query"],
  },

  execute: async (input: SearchKnowledgeInput): Promise<SearchKnowledgeOutput> => {
    const result = await knowledgeService.search({
      query: input.query,
      category: input.category,
      content_type: input.content_type,
      limit: 5,
    });

    return {
      data: result.data.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        metadata: item.metadata,
      })),
      total: result.total,
    };
  },
};