import { z } from "zod";
import {
  MAX_PRICE,
  MIN_PRICE,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
} from "../models/Product.js";

// Un prix en euros n'a jamais plus de deux décimales (centimes).
const hasAtMostTwoDecimals = (value) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const productFields = {
  name: z
    .string()
    .trim()
    .min(1, "Le nom du produit est requis.")
    .max(120, "Le nom ne doit pas dépasser 120 caractères."),
  brand: z
    .string()
    .trim()
    .min(1, "La marque est requise.")
    .max(60, "La marque ne doit pas dépasser 60 caractères."),
  category: z.enum(PRODUCT_CATEGORIES, { message: "Catégorie invalide." }),
  condition: z.enum(PRODUCT_CONDITIONS, { message: "État de produit invalide." }),
  price: z.coerce
    .number({ message: "Le prix doit être un nombre." })
    .min(MIN_PRICE, `Le prix doit être d'au moins ${MIN_PRICE} €.`)
    .max(MAX_PRICE, `Le prix ne doit pas dépasser ${MAX_PRICE} €.`)
    .refine(hasAtMostTwoDecimals, "Le prix ne peut pas avoir plus de deux décimales."),
  description: z
    .string()
    .trim()
    .max(2000, "La description ne doit pas dépasser 2000 caractères.")
    .optional(),
  imageUrl: z.string().trim().url("URL d'image invalide.").optional(),
};

export const createProductSchema = z.object(productFields);

// Modification : chaque champ est facultatif, mais au moins un est attendu.
export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((fields) => Object.keys(fields).length > 0, {
    message: "Aucune modification à enregistrer.",
  });
