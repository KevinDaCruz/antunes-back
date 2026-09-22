import { z } from "zod";

export const startConversationSchema = z.object({
  productId: z.string().min(1, "Le produit est requis."),
  content: z.string().trim().min(1, "Le message ne peut pas être vide.").max(2000),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Le message ne peut pas être vide.").max(2000),
});
