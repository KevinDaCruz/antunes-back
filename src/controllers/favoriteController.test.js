import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

async function createUser(overrides = {}) {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({
      firstName: "Kevin",
      lastName: "Da Cruz",
      pseudo: "kevintech",
      email: "kevin@example.com",
      password: "azerty123",
      ...overrides,
    });

  return response.body;
}

async function createProduct(token) {
  const response = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "iPhone 15 Pro",
      brand: "Apple",
      category: "Smartphones",
      condition: "Reconditionné",
      price: 950,
    });

  return response.body.product;
}

describe("Favorites", () => {
  it("rejects unauthenticated access", async () => {
    const response = await request(app).get("/api/favorites");

    expect(response.status).toBe(401);
  });

  it("starts with an empty favorites list", async () => {
    const { token } = await createUser();

    const response = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.products).toEqual([]);
  });

  it("adds and lists a favorite product", async () => {
    const { token } = await createUser();
    const product = await createProduct(token);

    const addResponse = await request(app)
      .post(`/api/favorites/${product._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(addResponse.status).toBe(204);

    const listResponse = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.body.products).toHaveLength(1);
    expect(listResponse.body.products[0].name).toBe("iPhone 15 Pro");
  });

  it("does not duplicate a favorite added twice", async () => {
    const { token } = await createUser();
    const product = await createProduct(token);

    await request(app)
      .post(`/api/favorites/${product._id}`)
      .set("Authorization", `Bearer ${token}`);
    await request(app)
      .post(`/api/favorites/${product._id}`)
      .set("Authorization", `Bearer ${token}`);

    const listResponse = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.body.products).toHaveLength(1);
  });

  it("removes a favorite", async () => {
    const { token } = await createUser();
    const product = await createProduct(token);

    await request(app)
      .post(`/api/favorites/${product._id}`)
      .set("Authorization", `Bearer ${token}`);

    const removeResponse = await request(app)
      .delete(`/api/favorites/${product._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(removeResponse.status).toBe(204);

    const listResponse = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${token}`);
    expect(listResponse.body.products).toEqual([]);
  });

  it("returns 404 when favoriting an unknown product", async () => {
    const { token } = await createUser();

    const response = await request(app)
      .post("/api/favorites/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
