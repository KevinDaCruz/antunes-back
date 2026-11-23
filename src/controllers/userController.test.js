import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { confirmEmail } from "../test/helpers.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Conversation } from "../models/Conversation.js";

const app = createApp();

describe("PATCH /api/users/me", () => {
  it("rejects unauthenticated access", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .send({ address: "1 rue de Paris" });

    expect(response.status).toBe(401);
  });

  it("updates the current user's address", async () => {
    const signupResponse = await request(app).post("/api/auth/signup").send({
      firstName: "Kevin",
      lastName: "Da Cruz",
      pseudo: "kevintech",
      email: "kevin@example.com",
      password: "Azerty-2026!x",
    });

    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${signupResponse.body.token}`)
      .send({ address: "1 Rue de Paris, 75001 Paris" });

    expect(response.status).toBe(200);
    expect(response.body.user.address).toBe("1 Rue de Paris, 75001 Paris");
  });

  it("updates firstName, lastName, pseudo and email together", async () => {
    const signupResponse = await request(app).post("/api/auth/signup").send({
      firstName: "Kevin",
      lastName: "Da Cruz",
      pseudo: "kevintech",
      email: "kevin@example.com",
      password: "Azerty-2026!x",
    });

    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${signupResponse.body.token}`)
      .send({
        firstName: "Kev",
        lastName: "DC",
        pseudo: "kevdc",
        email: "kevdc@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      firstName: "Kev",
      lastName: "DC",
      pseudo: "kevdc",
      email: "kevdc@example.com",
    });
  });

  it("rejects a pseudo already used by another account", async () => {
    await request(app).post("/api/auth/signup").send({
      firstName: "Alice",
      lastName: "Martin",
      pseudo: "alice",
      email: "alice@example.com",
      password: "Azerty-2026!x",
    });
    const bob = await request(app).post("/api/auth/signup").send({
      firstName: "Bob",
      lastName: "Martin",
      pseudo: "bob",
      email: "bob@example.com",
      password: "Azerty-2026!x",
    });

    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${bob.body.token}`)
      .send({ pseudo: "alice" });

    expect(response.status).toBe(409);
  });
});

describe("PATCH /api/users/me/password", () => {
  async function signup() {
    const response = await request(app).post("/api/auth/signup").send({
      firstName: "Kevin",
      lastName: "Da Cruz",
      pseudo: "kevintech",
      email: "kevin@example.com",
      password: "Azerty-2026!x",
    });

    return response.body;
  }

  it("rejects unauthenticated access", async () => {
    const response = await request(app)
      .patch("/api/users/me/password")
      .send({ currentPassword: "Azerty-2026!x", newPassword: "NouveauMdp-456!" });

    expect(response.status).toBe(401);
  });

  it("rejects an incorrect current password", async () => {
    const { token } = await signup();

    const response = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "wrong-password", newPassword: "NouveauMdp-456!" });

    expect(response.status).toBe(401);
  });

  it("changes the password and allows logging in with the new one", async () => {
    const { token } = await signup();

    const changeResponse = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "Azerty-2026!x", newPassword: "NouveauMdp-456!" });

    expect(changeResponse.status).toBe(200);

    const oldPasswordLogin = await request(app).post("/api/auth/login").send({
      email: "kevin@example.com",
      password: "Azerty-2026!x",
    });
    const newPasswordLogin = await request(app).post("/api/auth/login").send({
      email: "kevin@example.com",
      password: "NouveauMdp-456!",
    });

    expect(oldPasswordLogin.status).toBe(401);
    expect(newPasswordLogin.status).toBe(200);
  });
});

async function signupConfirmedUser(overrides = {}) {
  const payload = {
    firstName: "Kevin",
    lastName: "Da Cruz",
    pseudo: "kevintech",
    email: "kevin@example.com",
    password: "Azerty-2026!x",
    ...overrides,
  };
  const response = await request(app).post("/api/auth/signup").send(payload);
  await confirmEmail(payload.email);

  return response.body;
}

async function publishProduct(token, name = "iPhone 15 Pro") {
  const response = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name,
      brand: "Apple",
      category: "Smartphones",
      condition: "Reconditionné",
      price: 950,
    });

  return response.body.product;
}

describe("Changing the email address", () => {
  it("asks to confirm the new address again", async () => {
    const { token } = await signupConfirmedUser();

    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "new-address@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.user.emailVerified).toBe(false);
  });

  it("keeps the confirmation when the address does not change", async () => {
    const { token } = await signupConfirmedUser();

    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "kevin@example.com", firstName: "Kev" });

    expect(response.body.user.emailVerified).toBe(true);
  });
});

describe("GET /api/users/me/export", () => {
  it("rejects unauthenticated access", async () => {
    const response = await request(app).get("/api/users/me/export");

    expect(response.status).toBe(401);
  });

  it("returns the user's personal data without any secret", async () => {
    const { token } = await signupConfirmedUser();
    await publishProduct(token);

    const response = await request(app)
      .get("/api/users/me/export")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.profile.email).toBe("kevin@example.com");
    expect(response.body.products).toHaveLength(1);
    expect(response.body.orders).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });
});

describe("DELETE /api/users/me", () => {
  it("refuses to delete the account with a wrong password", async () => {
    const { token } = await signupConfirmedUser();

    const response = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(await User.countDocuments()).toBe(1);
  });

  it("deletes the account, its listings and conversations but keeps orders", async () => {
    const seller = await signupConfirmedUser();
    const buyer = await signupConfirmedUser({
      pseudo: "buyer",
      email: "buyer@example.com",
    });
    const product = await publishProduct(seller.token);

    await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id, content: "Toujours disponible ?" });
    await request(app)
      .post(`/api/favorites/${product._id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    await Order.create({
      product: product._id,
      buyer: seller.user.id,
      seller: buyer.user.id,
      amountTotal: 50,
      stripeSessionId: "cs_kept_for_accounting",
    });

    const response = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ password: "Azerty-2026!x" });

    expect(response.status).toBe(204);
    expect(await User.findById(seller.user.id)).toBeNull();
    expect(await Product.findById(product._id)).toBeNull();
    expect(await Conversation.countDocuments()).toBe(0);
    expect(await Order.countDocuments()).toBe(1);

    const buyerAfter = await User.findById(buyer.user.id);
    expect(buyerAfter.favorites).toHaveLength(0);

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${seller.token}`);
    expect(meResponse.status).toBe(401);
  });
});
