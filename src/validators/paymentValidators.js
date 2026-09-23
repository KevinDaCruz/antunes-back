import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
  productId: z.string().min(1, "Le produit est requis."),
});
