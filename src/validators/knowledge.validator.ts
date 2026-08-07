import { CreateKnowledgeDto, UpdateKnowledgeDto, SearchKnowledgeDto } from "../types/knowledge.interface";

export class ValidationError extends Error {
  public statusCode = 400;
  public isOperational = true;

  constructor(public errors: string[]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

const VALID_CATEGORIES = [
  "pricing",
  "process",
  "examples",
  "payments",
  "faq",
  "general",
  "requirements",
  "delivery",
];

const VALID_CONTENT_TYPES = [
  "text",
  "audio_sample",
  "image",
  "video",
  "file",
];

export const validateCreateKnowledge = (body: unknown): CreateKnowledgeDto => {
  const errors: string[] = [];
  const data = body as Record<string, unknown>;

  if (!data || typeof data !== "object") {
    errors.push("Body must be a JSON object");
  } else {
    // title
    if (!data.title || typeof data.title !== "string") {
      errors.push("title is required and must be a string");
    } else if (data.title.trim().length < 5) {
      errors.push("title must be at least 5 characters long");
    }

    // content
    if (!data.content || typeof data.content !== "string") {
      errors.push("content is required and must be a string");
    } else if (data.content.trim().length < 10) {
      errors.push("content must be at least 10 characters long");
    }

    // content_type (opcional)
    if (data.content_type !== undefined) {
      if (typeof data.content_type !== "string") {
        errors.push("content_type must be a string");
      } else if (!VALID_CONTENT_TYPES.includes(data.content_type)) {
        errors.push(`content_type must be one of: ${VALID_CONTENT_TYPES.join(", ")}`);
      }
    }

    // category
    if (!data.category || typeof data.category !== "string") {
      errors.push("category is required and must be a string");
    } else if (!VALID_CATEGORIES.includes(data.category)) {
      errors.push(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    // tags (opcional)
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        errors.push("tags must be an array of strings");
      } else {
        const invalid = data.tags.filter((t) => typeof t !== "string");
        if (invalid.length > 0) {
          errors.push("All tags must be strings");
        }
      }
    }

    // metadata (opcional)
    if (data.metadata !== undefined && typeof data.metadata !== "object") {
      errors.push("metadata must be a JSON object");
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return body as CreateKnowledgeDto;
};

export const validateUpdateKnowledge = (body: unknown): UpdateKnowledgeDto => {
  const errors: string[] = [];
  const data = body as Record<string, unknown>;

  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    errors.push("Body must be a non-empty JSON object");
  } else {
    if (
      data.title !== undefined &&
      (typeof data.title !== "string" || data.title.trim().length < 5)
    ) {
      errors.push("title must be a string with at least 5 characters");
    }

    if (
      data.content !== undefined &&
      (typeof data.content !== "string" || data.content.trim().length < 10)
    ) {
      errors.push("content must be a string with at least 10 characters");
    }

    if (
      data.content_type !== undefined &&
      (typeof data.content_type !== "string" ||
        !VALID_CONTENT_TYPES.includes(data.content_type))
    ) {
      errors.push(`content_type must be one of: ${VALID_CONTENT_TYPES.join(", ")}`);
    }

    if (
      data.category !== undefined &&
      (typeof data.category !== "string" ||
        !VALID_CATEGORIES.includes(data.category))
    ) {
      errors.push(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      errors.push("tags must be an array of strings");
    }

    if (data.metadata !== undefined && typeof data.metadata !== "object") {
      errors.push("metadata must be a JSON object");
    }

    if (
      data.is_active !== undefined &&
      typeof data.is_active !== "boolean"
    ) {
      errors.push("is_active must be a boolean");
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return body as UpdateKnowledgeDto;
};

export const validateSearchKnowledge = (query: unknown): SearchKnowledgeDto => {
  const errors: string[] = [];
  const data = query as Record<string, unknown>;

  if (data.category !== undefined && typeof data.category !== "string") {
    errors.push("category must be a string");
  }

  if (data.content_type !== undefined && typeof data.content_type !== "string") {
    errors.push("content_type must be a string");
  }

  if (data.limit !== undefined) {
    const limit = Number(data.limit);
    if (isNaN(limit) || limit < 1 || limit > 200) {
      errors.push("limit must be a number between 1 and 200");
    }
  }

  if (data.offset !== undefined) {
    const offset = Number(data.offset);
    if (isNaN(offset) || offset < 0) {
      errors.push("offset must be a non-negative number");
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return {
    query: typeof data.query === "string" ? data.query : undefined,
    category: typeof data.category === "string" ? data.category : undefined,
    content_type: typeof data.content_type === "string" ? data.content_type : undefined,
    tags: Array.isArray(data.tags) ? data.tags : undefined,
    limit: data.limit !== undefined ? Number(data.limit) : undefined,
    offset: data.offset !== undefined ? Number(data.offset) : undefined,
  };
};