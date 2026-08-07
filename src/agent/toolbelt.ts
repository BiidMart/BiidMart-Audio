// =============================================
// Toolbelt: Registro de herramientas del Agente
// =============================================

import { ToolDefinition, ToolName, ToolInput, ToolOutput } from "./tool.types";
import { searchKnowledgeTool } from "./tools/search-knowledge.tool";
import { getMultimediaTool } from "./tools/get-multimedia.tool";
import { askClarificationTool } from "./tools/ask-clarification.tool";
import { handoffToHumanTool } from "./tools/handoff-to-human.tool";
import { markReadyToBuyTool } from "./tools/mark-ready-to-buy.tool";
import { sendResponseTool } from "./tools/send-response.tool";

const tools = new Map<ToolName, ToolDefinition>();

tools.set("search_knowledge", searchKnowledgeTool as ToolDefinition);
tools.set("get_multimedia", getMultimediaTool as ToolDefinition);
tools.set("ask_clarification", askClarificationTool as ToolDefinition);
tools.set("handoff_to_human", handoffToHumanTool as ToolDefinition);
tools.set("mark_ready_to_buy", markReadyToBuyTool as ToolDefinition);
tools.set("send_response", sendResponseTool as ToolDefinition);

export const toolbelt = {
  get: (name: ToolName): ToolDefinition | undefined => {
    return tools.get(name);
  },

  getAll: (): ToolDefinition[] => {
    return Array.from(tools.values());
  },

  execute: async (name: ToolName, input: ToolInput): Promise<ToolOutput> => {
    const tool = tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(input);
  },
};