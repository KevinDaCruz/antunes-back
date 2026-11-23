import { Router } from "express";
import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import favoriteRoutes from "./favoriteRoutes.js";
import conversationRoutes from "./conversationRoutes.js";
import userRoutes from "./userRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import privacyRequestRoutes from "./privacyRequestRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/conversations", conversationRoutes);
router.use("/users", userRoutes);
router.use("/payments", paymentRoutes);
router.use("/privacy-requests", privacyRequestRoutes);

export default router;
