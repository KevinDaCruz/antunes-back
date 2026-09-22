import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

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
      password: "azerty123",
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
      password: "azerty123",
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
      password: "azerty123",
    });
    const bob = await request(app).post("/api/auth/signup").send({
      firstName: "Bob",
      lastName: "Martin",
      pseudo: "bob",
      email: "bob@example.com",
      password: "azerty123",
    });

    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${bob.body.token}`)
      .send({ pseudo: "alice" });

    expect(response.status).toBe(409);
  });
});
