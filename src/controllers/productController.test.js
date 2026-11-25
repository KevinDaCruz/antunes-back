import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { confirmEmail } from "../test/helpers.js";
import { Product } from "../models/Product.js";

const app = createApp();

async function createAuthenticatedUser() {
  const response = await request(app).post("/api/auth/signup").send({
    firstName: "Kevin",
    lastName: "Da Cruz",
    pseudo: "kevintech",
    email: "kevin@example.com",
    password: "Azerty-2026!x",
  });

  await confirmEmail(response.body.user.email);

  return response.body.token;
}

async function createProduct(token, overrides = {}) {
  return request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "iPhone 15 Pro",
      brand: "Apple",
      category: "Smartphones",
      condition: "Reconditionné",
      price: 950,
      ...overrides,
    });
}

describe("POST /api/products", () => {
  it("rejects an unauthenticated request", async () => {
    const response = await request(app).post("/api/products").send({
      name: "iPhone 15 Pro",
    });

    expect(response.status).toBe(401);
  });

  it("creates a product owned by the authenticated user", async () => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token);

    expect(response.status).toBe(201);
    expect(response.body.product.name).toBe("iPhone 15 Pro");
    expect(response.body.product.seller).toBeTruthy();
  });

  it("returns the seller's pseudo already populated, without needing a refetch", async () => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token);

    expect(response.body.product.seller.pseudo).toBe("kevintech");
  });

  it("refuses to publish while the email address is not confirmed", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      firstName: "Nina",
      lastName: "Martin",
      pseudo: "ninam",
      email: "nina@example.com",
      password: "Azerty-2026!x",
    });

    const publishResponse = await createProduct(response.body.token);

    expect(publishResponse.status).toBe(403);
  });

  it("exposes the buyer service fee (5 % + 0,70 €) on the product", async () => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token, { price: 100 });

    expect(response.body.product.serviceFee).toBe(5.7);
  });

  it("ignores a status sent by the client", async () => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token, { status: "sold" });

    expect(response.body.product.status).toBe("available");
  });

  it("rejects an invalid condition", async () => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token, { condition: "Douteux" });

    expect(response.status).toBe(400);
  });

  it("rejects a negative price", async () => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token, { price: -10 });

    expect(response.status).toBe(400);
  });

  it.each([
    [0, "Le prix doit être d'au moins 1 €."],
    [25000, "Le prix ne doit pas dépasser 20000 €."],
    [9.999, "Le prix ne peut pas avoir plus de deux décimales."],
  ])("rejects a price of %s € with a clear message", async (price, message) => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token, { price });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(message);
  });

  it("accepts a price with cents", async () => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token, { price: 19.99 });

    expect(response.status).toBe(201);
    expect(response.body.product.price).toBe(19.99);
  });

  it("rejects a category outside the closed list", async () => {
    const token = await createAuthenticatedUser();

    const response = await createProduct(token, { category: "Voitures" });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Catégorie invalide.");
  });
});

describe("GET /api/products", () => {
  it("lists every product", async () => {
    const token = await createAuthenticatedUser();
    await createProduct(token, { name: "iPhone 15 Pro", category: "Smartphones" });
    await createProduct(token, { name: "PS5 Slim", category: "Consoles" });

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(2);
  });

  it("filters by category", async () => {
    const token = await createAuthenticatedUser();
    await createProduct(token, { name: "iPhone 15 Pro", category: "Smartphones" });
    await createProduct(token, { name: "PS5 Slim", category: "Consoles" });

    const response = await request(app)
      .get("/api/products")
      .query({ category: "Consoles" });

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0].name).toBe("PS5 Slim");
  });

  it("sorts by ascending price", async () => {
    const token = await createAuthenticatedUser();
    await createProduct(token, { name: "Cher", price: 900 });
    await createProduct(token, { name: "Pas cher", price: 50 });

    const response = await request(app)
      .get("/api/products")
      .query({ sort: "priceAsc" });

    expect(response.body.products[0].name).toBe("Pas cher");
    expect(response.body.products[1].name).toBe("Cher");
  });
});

describe("GET /api/products/:id", () => {
  it("returns a single product", async () => {
    const token = await createAuthenticatedUser();
    const createResponse = await createProduct(token);

    const response = await request(app).get(
      `/api/products/${createResponse.body.product._id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.product.name).toBe("iPhone 15 Pro");
  });

  it("returns 404 for a well-formed but unknown id", async () => {
    const response = await request(app).get(
      "/api/products/507f1f77bcf86cd799439011",
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed id instead of crashing", async () => {
    const response = await request(app).get("/api/products/not-an-id");

    expect(response.status).toBe(404);
  });
});

describe("Sold products", () => {
  it("are hidden from the catalog but still reachable by their id", async () => {
    const token = await createAuthenticatedUser();
    const soldResponse = await createProduct(token, { name: "PS5 Slim" });
    await createProduct(token, { name: "Raspberry Pi 4" });
    await Product.findByIdAndUpdate(soldResponse.body.product._id, {
      status: "sold",
    });

    const catalogResponse = await request(app).get("/api/products");
    const detailResponse = await request(app).get(
      `/api/products/${soldResponse.body.product._id}`,
    );

    expect(catalogResponse.body.products).toHaveLength(1);
    expect(catalogResponse.body.products[0].name).toBe("Raspberry Pi 4");
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.product.status).toBe("sold");
  });
});

describe("GET /api/products/mine", () => {
  it("rejects unauthenticated access", async () => {
    const response = await request(app).get("/api/products/mine");

    expect(response.status).toBe(401);
  });

  it("lists only the current user's products, including sold ones", async () => {
    const token = await createAuthenticatedUser();
    const mine = await createProduct(token);
    await Product.findByIdAndUpdate(mine.body.product._id, { status: "sold" });

    const otherSignup = await request(app).post("/api/auth/signup").send({
      firstName: "Nina",
      lastName: "Martin",
      pseudo: "ninam",
      email: "nina@example.com",
      password: "Azerty-2026!x",
    });
    await confirmEmail("nina@example.com");
    await createProduct(otherSignup.body.token);

    const response = await request(app)
      .get("/api/products/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0].status).toBe("sold");
  });
});

async function createOtherUser() {
  const response = await request(app).post("/api/auth/signup").send({
    firstName: "Nina",
    lastName: "Martin",
    pseudo: "ninam",
    email: "nina@example.com",
    password: "Azerty-2026!x",
  });
  await confirmEmail("nina@example.com");

  return response.body.token;
}

describe("PATCH /api/products/:id", () => {
  it("lets the seller update the price and description", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);

    const response = await request(app)
      .patch(`/api/products/${created.body.product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 899.5, description: "Batterie neuve." });

    expect(response.status).toBe(200);
    expect(response.body.product.price).toBe(899.5);
    expect(response.body.product.description).toBe("Batterie neuve.");
    expect(response.body.product.name).toBe("iPhone 15 Pro");
  });

  it("refuses to let another member update the listing", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);
    const otherToken = await createOtherUser();

    const response = await request(app)
      .patch(`/api/products/${created.body.product._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ price: 1 });

    expect(response.status).toBe(403);
    const product = await Product.findById(created.body.product._id);
    expect(product.price).toBe(950);
  });

  it("refuses to update a sold listing", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);
    await Product.findByIdAndUpdate(created.body.product._id, { status: "sold" });

    const response = await request(app)
      .patch(`/api/products/${created.body.product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 800 });

    expect(response.status).toBe(409);
  });

  it("ignores a status or seller sent by the client", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);
    const otherToken = await createOtherUser();
    const other = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${otherToken}`);

    await request(app)
      .patch(`/api/products/${created.body.product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 900, status: "sold", seller: other.body.user._id });

    const product = await Product.findById(created.body.product._id);
    expect(product.status).toBe("available");
    expect(product.seller.toString()).toBe(created.body.product.seller._id);
  });

  it("rejects an empty update", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);

    const response = await request(app)
      .patch(`/api/products/${created.body.product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/products/:id", () => {
  it("withdraws the listing from the catalog and from favorites", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);
    const productId = created.body.product._id;
    const otherToken = await createOtherUser();
    await request(app)
      .post(`/api/favorites/${productId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
    const catalog = await request(app).get("/api/products");
    expect(catalog.body.products).toHaveLength(0);
    const favorites = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(favorites.body.products).toHaveLength(0);
    const direct = await request(app).get(`/api/products/${productId}`);
    expect(direct.body.product.status).toBe("withdrawn");
  });

  it("makes a withdrawn listing impossible to buy", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);
    const otherToken = await createOtherUser();
    await request(app)
      .delete(`/api/products/${created.body.product._id}`)
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .post("/api/payments/checkout-session")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ productId: created.body.product._id });

    expect(response.status).toBe(409);
  });

  it("refuses to let another member withdraw the listing", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);
    const otherToken = await createOtherUser();

    const response = await request(app)
      .delete(`/api/products/${created.body.product._id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(403);
  });

  it("refuses to withdraw a sold listing", async () => {
    const token = await createAuthenticatedUser();
    const created = await createProduct(token);
    await Product.findByIdAndUpdate(created.body.product._id, { status: "sold" });

    const response = await request(app)
      .delete(`/api/products/${created.body.product._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(409);
  });
});
