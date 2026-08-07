import { Router } from "express";
import { findAll, findById } from "../controllers/client.controller";

const router = Router();

router.get("/", findAll);
router.get("/:id", findById);

export default router;