// =============================================
// Resource Controller
// Endpoints REST para administración de recursos.
// =============================================

import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { resourceService } from "../services/resource.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const findAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const result = await resourceService.findAll(includeInactive);
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
    const resourceId = req.params.id as string;
    const resource = await resourceService.findById(resourceId);
    if (!resource) {
      res.status(404).json({ message: "Resource not found" });
      return;
    }
    res.json(resource);
  } catch (error) {
    next(error);
  }
};

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, category, tags, knowledge_id } = req.body;
    if (!title || !category) {
      res.status(400).json({ error: { message: "title and category are required" } });
      return;
    }
    const resource = await resourceService.create({
      title: title as string,
      description: description as string,
      category: category as string,
      tags: tags ? (Array.isArray(tags) ? tags : (tags as string).split(",").map((t: string) => t.trim())) : [],
      knowledge_id: (knowledge_id as string) || null,
    });
    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const resourceId = req.params.id as string;
  try {
    const dto = req.body;
    if (dto.tags && typeof dto.tags === "string") {
      dto.tags = (dto.tags as string).split(",").map((t: string) => t.trim());
    }
    const resource = await resourceService.update(resourceId, dto);
    if (!resource) {
      res.status(404).json({ message: "Resource not found" });
      return;
    }
    res.json(resource);
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const resourceId = req.params.id as string;
  try {
    const deleted = await resourceService.delete(resourceId);
    if (!deleted) {
      res.status(404).json({ message: "Resource not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ─── Archivos ───

export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const resourceId = req.params.id as string;
  const uploadSingle = upload.single("file");
  uploadSingle(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: { message: err.message } });
      return;
    }
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: { message: "No file uploaded" } });
        return;
      }
      const { display_name, role, sort_order } = req.body;
      const resourceFile = await resourceService.uploadFile(
        resourceId,
        file.buffer,
        file.originalname,
        file.mimetype,
        (display_name as string) || file.originalname,
        (role as string) || "file",
        sort_order ? parseInt(sort_order as string, 10) : 0
      );
      res.status(201).json(resourceFile);
    } catch (error) {
      next(error);
    }
  });
};

export const getFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const resourceId = req.params.id as string;
  try {
    const files = await resourceService.getFiles(resourceId);
    res.json(files);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const fileId = req.params.fileId as string;
  try {
    await resourceService.deleteFile(fileId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};