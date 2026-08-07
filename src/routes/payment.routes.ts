import { Router } from "express";
import { create, findAll, findByClient } from "../controllers/payment.controller";

const router = Router();

router.post("/", create);
router.get("/", findAll);
router.get("/client/:clientId", findByClient);

export default router;