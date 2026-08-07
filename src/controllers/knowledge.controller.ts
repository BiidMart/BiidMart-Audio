import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { knowledgeService } from "../services/knowledge.service";
import { knowledgeIngestion } from "../services/knowledge-ingestion.service";
import { supabaseStorage } from "../services/supabase-storage.service";
import {
  validateCreateKnowledge,
  validateUpdateKnowledge,
  validateSearchKnowledge,
} from "../validators/knowledge.validator";

// Configuración de multer para recibir archivos en memoria (máx 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("file");

export const uploadMiddleware = upload;

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = validateCreateKnowledge(req.body);
    const knowledge = await knowledgeService.create(dto);
    res.status(201).json(knowledge);
  } catch (error) {
    next(error);
  }
};

export const findAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const result = await knowledgeService.findAll(limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const findById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const knowledge = await knowledgeService.findById(req.params.id as string);
    if (!knowledge) {
      res.status(404).json({ message: "Knowledge not found" });
      return;
    }
    res.json(knowledge);
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = validateUpdateKnowledge(req.body);
    const knowledge = await knowledgeService.update(req.params.id as string, dto);
    if (!knowledge) {
      res.status(404).json({ message: "Knowledge not found" });
      return;
    }
    res.json(knowledge);
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deleted = await knowledgeService.delete(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ message: "Knowledge not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const search = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = validateSearchKnowledge(req.query);
    const result = await knowledgeService.search(dto);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const findByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const knowledge = await knowledgeService.findByCategory(req.params.category as string);
    res.json(knowledge);
  } catch (error) {
    next(error);
  }
};

export const findByContentType = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const knowledge = await knowledgeService.findByContentType(req.params.contentType as string);
    res.json(knowledge);
  } catch (error) {
    next(error);
  }
};

// =============================================
// ENDPOINT DE CARGA DE DOCUMENTOS Y MULTIMEDIA
// =============================================

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: { message: "No file uploaded" } });
      return;
    }

    const category = (req.body.category as string) || "general";
    const customTags = req.body.tags
      ? (req.body.tags as string).split(",").map((t) => t.trim())
      : [];

    const mimetype = file.mimetype;
    const originalName = file.originalname;
    const buffer = file.buffer;

    // Determinar si es un documento de texto o un archivo multimedia
    const isDocument = [
      "text/plain",
      "text/markdown",
      "text/csv",
      "text/x-markdown",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(mimetype);

    if (isDocument) {
      // === FLUJO DE DOCUMENTO: extraer texto → chunking → crear fragmentos ===
      const result = await knowledgeIngestion.ingestDocument(
        buffer,
        mimetype,
        originalName,
        category,
        customTags
      );

      res.status(201).json({
        message: "Document ingested successfully",
        fragments_created: result.fragmentsCreated,
        ids: result.ids,
      });
    } else {
      // === FLUJO DE MULTIMEDIA: subir a Storage → crear referencia en knowledge ===
      const folder = getStorageFolder(mimetype);
      const timestamp = Date.now();
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${folder}/${timestamp}-${safeName}`;

      // Subir a Supabase Storage
      const uploaded = await supabaseStorage.uploadFile(
        filePath,
        buffer,
        mimetype
      );

      // Crear registro en knowledge
      const knowledgeType = getContentType(mimetype);

      const record = await knowledgeService.create({
        title: originalName,
        content: `Archivo multimedia: ${originalName}`,
        content_type: knowledgeType,
        category,
        tags: customTags,
        metadata: {
          file_url: uploaded.url,
          file_path: uploaded.path,
          file_type: mimetype,
          file_size: buffer.length,
          original_name: originalName,
        },
      });

      res.status(201).json({
        message: "Media file uploaded successfully",
        file_url: uploaded.url,
        knowledge_id: record.id,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Helpers para determinar directorio y content_type según MIME

const getStorageFolder = (mimetype: string): string => {
  if (mimetype.startsWith("audio/")) return "audio/samples";
  if (mimetype.startsWith("image/")) return "images/portfolio";
  if (mimetype.startsWith("video/")) return "videos/testimonials";
  return "documents/contracts";
};

const getContentType = (mimetype: string): string => {
  if (mimetype.startsWith("audio/")) return "audio_sample";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "file";
};
