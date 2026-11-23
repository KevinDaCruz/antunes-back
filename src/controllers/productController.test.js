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
