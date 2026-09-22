import { Router } from "express";
import {
  listConversations,
  getConversation,
  startConversation,
  sendMessage,
} from "../controllers/conversationController.js";
import { validateBody } from "../middlewares/validate.js";
import {
  startConversationSchema,
  sendMessageSchema,
} from "../validators/conversationValidators.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listConversations);
router.post("/", validateBody(startConversationSchema), startConversation);
router.get("/:id", getConversation);
router.post("/:id/messages", validateBody(sendMessageSchema), sendMessage);

export default router;
