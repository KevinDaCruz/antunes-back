import { Router } from "express";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listFavorites);
router.post("/:productId", addFavorite);
router.delete("/:productId", removeFavorite);

export default router;
