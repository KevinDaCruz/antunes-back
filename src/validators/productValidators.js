import { z } from "zod";

const CONDITIONS = ["Neuf", "Reconditionné", "Bon état", "Occasion"];

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Le nom du produit est requis.").max(120),
  brand: z.string().trim().min(1, "La marque est requise.").max(60),
  category: z.string().trim().min(1, "La catégorie est requise."),
  condition: z.enum(CONDITIONS, {
    message: "État de produit invalide.",
  }),
  price: z.coerce.number().min(0, "Le prix doit être positif."),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().url("URL d'image invalide.").optional(),
});
