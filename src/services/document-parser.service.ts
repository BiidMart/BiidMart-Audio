// =============================================
// Document Parser Service
// Extrae texto de documentos: PDF, DOCX, TXT, MD, CSV
// =============================================

import { logger } from "../utils/logger";

// Tipos internos
export interface ParsedDocument {
  text: string;
  metadata: {
    source_type: string;
    original_name: string;
    size_bytes: number;
  };
}

// Formatos soportados
const SUPPORTED_MIMETYPES = new Map<string, string>([
  ["text/plain", "txt"],
  ["text/markdown", "md"],
  ["text/csv", "csv"],
  ["text/x-markdown", "md"],
  ["application/pdf", "pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

// =============================================
// HELPERS DE EXTRACCIÓN
// =============================================

const parseTxt = (buffer: Buffer): string => {
  return buffer.toString("utf-8");
};

const parseCsv = (buffer: Buffer): string => {
  const raw = buffer.toString("utf-8");
  // Convertir CSV a texto legible para chunks
  const lines = raw.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return "";
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return headers.map((h, i) => `${h}: ${values[i] || ""}`).join(". ");
    })
    .join("\n");
};

const parsePdf = async (buffer: Buffer): Promise<string> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text;
  } catch {
    throw new Error(
      "Failed to parse PDF. Ensure pdf-parse is installed."
    );
  }
};

const parseDocx = async (buffer: Buffer): Promise<string> => {
  try {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    throw new Error(
      "Failed to parse DOCX. Ensure mammoth is installed."
    );
  }
};

// =============================================
// API PÚBLICA
// =============================================

export const documentParser = {
  /**
   * Determina si un mimetype es soportado.
   */
  isSupported: (mimetype: string): boolean => {
    return SUPPORTED_MIMETYPES.has(mimetype);
  },

  /**
   * Retorna los mimetypes soportados.
   */
  getSupportedTypes: (): string[] => {
    return Array.from(SUPPORTED_MIMETYPES.keys());
  },

  /**
   * Extrae texto de un buffer según su mimetype.
   * @param buffer Contenido binario del archivo
   * @param mimetype MIME type del archivo
   * @param originalName Nombre original del archivo
   */
  parse: async (
    buffer: Buffer,
    mimetype: string,
    originalName: string
  ): Promise<ParsedDocument> => {
    const docType = SUPPORTED_MIMETYPES.get(mimetype);

    if (!docType) {
      throw new Error(
        `Unsupported file type: ${mimetype}. Supported: ${Array.from(SUPPORTED_MIMETYPES.values()).join(", ")}`
      );
    }

    logger.info(`[Parser] Extracting text from ${docType}: ${originalName}`);

    let text: string;

    switch (docType) {
      case "txt":
      case "md":
        text = parseTxt(buffer);
        break;
      case "csv":
        text = parseCsv(buffer);
        break;
      case "pdf":
        text = await parsePdf(buffer);
        break;
      case "docx":
        text = await parseDocx(buffer);
        break;
      default:
        throw new Error(`Parser not implemented for: ${docType}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error(`No text content extracted from ${originalName}`);
    }

    logger.info(
      `[Parser] Extracted ${text.length} characters from ${originalName}`
    );

    return {
      text: text.trim(),
      metadata: {
        source_type: docType,
        original_name: originalName,
        size_bytes: buffer.length,
      },
    };
  },
};