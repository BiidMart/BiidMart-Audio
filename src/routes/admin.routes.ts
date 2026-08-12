import { Router } from "express";
import { adminAuth } from "../middlewares/admin-auth";
import {
  listConversations,
  getMessages,
  sendReply,
  deleteConversation,
} from "../controllers/admin.controller";

const router = Router();

router.use(adminAuth);

router.get("/conversations", listConversations);
router.get("/conversations/:phone/messages", getMessages);
router.post("/conversations/:phone/reply", sendReply);
router.delete("/conversations/:id", deleteConversation);

export default router;
