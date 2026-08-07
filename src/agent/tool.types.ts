// =============================================
// Tipos para las herramientas del Agente IA
// =============================================

export type ToolName =
  | "search_knowledge"
  | "get_multimedia"
  | "ask_clarification"
  | "handoff_to_human"
  | "mark_ready_to_buy"
  | "send_response";

// Input de cada herramienta
export interface SearchKnowledgeInput {
  query: string;
  category?: string;
  content_type?: string;
}

export interface GetMultimediaInput {
  content_type: string;
  tags?: string[];
}

export interface AskClarificationInput {
  question: string;
}

export interface HandoffToHumanInput {
  reason: string;
  summary: string;
}

export interface MarkReadyToBuyInput {
  summary: string;
}

export interface SendResponseInput {
  text: string;
  attachments?: string[];
}

export type ToolInput =
  | SearchKnowledgeInput
  | GetMultimediaInput
  | AskClarificationInput
  | HandoffToHumanInput
  | MarkReadyToBuyInput
  | SendResponseInput;

// Output de cada herramienta
export interface SearchKnowledgeOutput {
  data: {
    id: string;
    title: string;
    content: string;
    metadata: Record<string, unknown>;
  }[];
  total: number;
}

export interface GetMultimediaOutput {
  files: {
    url: string;
    type: string;
    title: string;
  }[];
}

export interface AskClarificationOutput {
  question: string;
  asked: boolean;
}

export interface HandoffToHumanOutput {
  transferred: boolean;
  reason: string;
  summary: string;
}

export interface MarkReadyToBuyOutput {
  marked: boolean;
  summary: string;
}

export interface SendResponseOutput {
  sent: boolean;
  text: string;
  attachments?: string[];
}

export type ToolOutput =
  | SearchKnowledgeOutput
  | GetMultimediaOutput
  | AskClarificationOutput
  | HandoffToHumanOutput
  | MarkReadyToBuyOutput
  | SendResponseOutput;

// Definición de herramienta para el Toolbelt
export interface ToolDefinition<
  I extends ToolInput = ToolInput,
  O extends ToolOutput = ToolOutput
> {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: I) => Promise<O>;
}