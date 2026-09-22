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

async function createProduct(sellerToken) {
  const response = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({
      name: "iPhone 15 Pro",
      brand: "Apple",
      category: "Smartphones",
      condition: "Reconditionné",
      price: 950,
    });

  return response.body.product;
}

async function setupBuyerAndProduct() {
  const seller = await createUser({
    pseudo: "seller",
    email: "seller@example.com",
  });
  const buyer = await createUser({
    pseudo: "buyer",
    email: "buyer@example.com",
  });
  const product = await createProduct(seller.token);

  return { seller, buyer, product };
}

describe("POST /api/conversations", () => {
  it("rejects unauthenticated access", async () => {
    const response = await request(app).post("/api/conversations").send({});

    expect(response.status).toBe(401);
  });

  it("creates a conversation with the seller and the first message", async () => {
    const { buyer, seller, product } = await setupBuyerAndProduct();

    const response = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id, content: "Toujours disponible ?" });

    expect(response.status).toBe(201);
    expect(response.body.conversation.messages).toHaveLength(1);
    const participantIds = response.body.conversation.participants.map(
      (participant) => participant._id,
    );
    expect(participantIds).toContain(buyer.user.id);
    expect(participantIds).toContain(seller.user.id);
  });

  it("reuses the existing conversation instead of duplicating it", async () => {
    const { buyer, product } = await setupBuyerAndProduct();

    const first = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id, content: "Toujours disponible ?" });

    const second = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id, content: "Une réponse ?" });

    expect(second.body.conversation._id).toBe(first.body.conversation._id);
    expect(second.body.conversation.messages).toHaveLength(2);
  });

  it("rejects a seller starting a conversation on their own product", async () => {
    const seller = await createUser({
      pseudo: "seller",
      email: "seller@example.com",
    });
    const product = await createProduct(seller.token);

    const response = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ productId: product._id, content: "Allo moi-même" });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/conversations and /api/conversations/:id", () => {
  it("only lists conversations the user participates in", async () => {
    const { buyer, seller, product } = await setupBuyerAndProduct();
    const stranger = await createUser({
      pseudo: "stranger",
      email: "stranger@example.com",
    });

    await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id, content: "Salut" });

    const buyerList = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`);
    const sellerList = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${seller.token}`);
    const strangerList = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(buyerList.body.conversations).toHaveLength(1);
    expect(sellerList.body.conversations).toHaveLength(1);
    expect(strangerList.body.conversations).toHaveLength(0);
  });

  it("denies access to a conversation for a non-participant", async () => {
    const { buyer, product } = await setupBuyerAndProduct();
    const stranger = await createUser({
      pseudo: "stranger",
      email: "stranger@example.com",
    });

    const created = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id, content: "Salut" });

    const response = await request(app)
      .get(`/api/conversations/${created.body.conversation._id}`)
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(response.status).toBe(403);
  });
});

describe("POST /api/conversations/:id/messages", () => {
  it("appends a message to the conversation", async () => {
    const { buyer, seller, product } = await setupBuyerAndProduct();

    const created = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id, content: "Salut" });

    const response = await request(app)
      .post(`/api/conversations/${created.body.conversation._id}/messages`)
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ content: "Oui, toujours dispo !" });

    expect(response.status).toBe(201);
    expect(response.body.conversation.messages).toHaveLength(2);
  });

  it("returns 404 for a non-existent conversation", async () => {
    const { buyer } = await setupBuyerAndProduct();

    const response = await request(app)
      .post("/api/conversations/507f1f77bcf86cd799439011/messages")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ content: "Salut" });

    expect(response.status).toBe(404);
  });
});
