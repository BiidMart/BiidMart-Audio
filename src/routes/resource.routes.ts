import { Router } from "express";
import { adminAuth } from "../middlewares/admin-auth";
import {
  findAll,
  findById,
  create,
  update,
  remove,
  uploadFile,
  getFiles,
  deleteFile,
} from "../controllers/resource.controller";

const router = Router();

router.use(adminAuth);

router.get("/", findAll);
router.get("/:id", findById);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

// Archivos dentro de un recurso
router.post("/:id/files", uploadFile);
router.get("/:id/files", getFiles);
router.delete("/:id/files/:fileId", deleteFile);

export default router;