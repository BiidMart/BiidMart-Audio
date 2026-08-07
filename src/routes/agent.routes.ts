import { Router } from "express";
import { sendMessage, getContext, resetSession } from "../controllers/agent.controller";

const router = Router();

router.post("/message", sendMessage);
router.get("/session/:sessionId", getContext);
router.delete("/session/:sessionId", resetSession);

export default router;