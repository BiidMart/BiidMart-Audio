import { Router } from "express";
import { adminAuth } from "../middlewares/admin-auth";
import {
  create,
  findAll,
  findById,
  update,
  remove,
  search,
  findByCategory,
  findByContentType,
  uploadDocument,
  uploadMiddleware,
} from "../controllers/knowledge.controller";

const router = Router();

// Todas las rutas de administración de conocimiento requieren autenticación
router.use(adminAuth);

router.post("/", create);
router.get("/", findAll);
router.get("/search", search);
router.get("/category/:category", findByCategory);
router.get("/content-type/:contentType", findByContentType);
router.post("/upload", uploadMiddleware, uploadDocument);
router.get("/:id", findById);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
