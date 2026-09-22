import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";

const DEMO_PRODUCTS = [
  {
    name: "iPhone 15 Pro",
    brand: "Apple",
    category: "Smartphones",
    condition: "Reconditionné",
    price: 950,
    description:
      "iPhone 15 Pro reconditionné, écran et batterie vérifiés, livré avec chargeur et câble.",
    imageUrl: "https://placehold.co/600x600.png?text=iPhone+15",
  },
  {
    name: "Raspberry Pi 4 Model B",
    brand: "Raspberry Pi",
    category: "Composants",
    condition: "Neuf",
    price: 65,
    description:
      "Raspberry Pi 4 Model B neuf sous blister, 4 Go de RAM, idéal pour tes projets DIY.",
    imageUrl: "https://placehold.co/600x600.png?text=Raspberry+Pi",
  },
  {
    name: "Console Sony PS5 Slim",
    brand: "Sony",
    category: "Consoles",
    condition: "Bon état",
    price: 400,
    description:
      "PS5 Slim en bon état, boîte d'origine, une manette incluse, aucun problème technique.",
    imageUrl: "https://placehold.co/600x600.png?text=PS5+Slim",
  },
  {
    name: "SSD Interne Samsung 980 Pro 1To",
    brand: "Samsung",
    category: "SSD & stockage",
    condition: "Neuf",
    price: 110,
    description:
      "SSD NVMe Samsung 980 Pro 1To neuf, jamais installé, encore sous emballage.",
    imageUrl: "https://placehold.co/600x600.png?text=Samsung+SSD",
  },
];

async function seed() {
  await connectDB(process.env.MONGO_URI);

  await Product.deleteMany({});
  await User.deleteMany({ pseudo: "DemoSeller" });

  const demoSeller = await User.create({
    pseudo: "DemoSeller",
    email: "demo-seller@antunes.local",
    passwordHash: await User.hashPassword("demo-password-123"),
    firstName: "Demo",
    lastName: "Seller",
  });

  await Product.insertMany(
    DEMO_PRODUCTS.map((product) => ({ ...product, seller: demoSeller._id })),
  );

  console.log(`Base réinitialisée : ${DEMO_PRODUCTS.length} produits créés.`);

  await disconnectDB();
}

seed().catch((error) => {
  console.error("Échec du seed :", error);
  process.exit(1);
});
