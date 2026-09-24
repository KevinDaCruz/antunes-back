import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../config/stripe.js", () => ({
  getStripeClient: vi.fn(),
}));

const { getStripeClient } = await import("../config/stripe.js");
const { createApp } = await import("../app.js");
const { Order } = await import("../models/Order.js");

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

describe("POST /api/payments/checkout-session", () => {
  let fakeStripe;

  beforeEach(() => {
    fakeStripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/pay/cs_test_123",
          }),
        },
      },
    };
    getStripeClient.mockReturnValue(fakeStripe);
  });

  it("rejects unauthenticated access", async () => {
    const response = await request(app)
      .post("/api/payments/checkout-session")
      .send({ productId: "507f1f77bcf86cd799439011" });

    expect(response.status).toBe(401);
  });

  it("creates a Stripe Checkout session and a pending order", async () => {
    const seller = await createUser({
      pseudo: "seller",
      email: "seller@example.com",
    });
    const buyer = await createUser({
      pseudo: "buyer",
      email: "buyer@example.com",
    });
    const product = await createProduct(seller.token);

    const response = await request(app)
      .post("/api/payments/checkout-session")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id });

    expect(response.status).toBe(201);
    expect(response.body.url).toBe("https://checkout.stripe.com/pay/cs_test_123");
    expect(fakeStripe.checkout.sessions.create).toHaveBeenCalledOnce();

    const order = await Order.findOne({ stripeSessionId: "cs_test_123" });
    expect(order.status).toBe("pending");
    expect(order.amountTotal).toBe(950);
  });

  it("sends the price to Stripe in cents", async () => {
    const seller = await createUser({
      pseudo: "seller",
      email: "seller@example.com",
    });
    const buyer = await createUser({
      pseudo: "buyer",
      email: "buyer@example.com",
    });
    const product = await createProduct(seller.token);

    await request(app)
      .post("/api/payments/checkout-session")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: product._id });

    const callArgs = fakeStripe.checkout.sessions.create.mock.calls[0][0];
    expect(callArgs.line_items[0].price_data.unit_amount).toBe(95000);
  });

  it("rejects buying your own product", async () => {
    const seller = await createUser();
    const product = await createProduct(seller.token);

    const response = await request(app)
      .post("/api/payments/checkout-session")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ productId: product._id });

    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown product", async () => {
    const buyer = await createUser();

    const response = await request(app)
      .post("/api/payments/checkout-session")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: "507f1f77bcf86cd799439011" });

    expect(response.status).toBe(404);
  });
});

describe("GET /api/payments/orders", () => {
  it("rejects unauthenticated access", async () => {
    const response = await request(app).get("/api/payments/orders");

    expect(response.status).toBe(401);
  });

  it("only lists the current user's orders, most recent first", async () => {
    const fakeStripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValueOnce({ id: "cs_1", url: "https://x/cs_1" })
            .mockResolvedValueOnce({ id: "cs_2", url: "https://x/cs_2" }),
        },
      },
    };
    getStripeClient.mockReturnValue(fakeStripe);

    const seller = await createUser({
      pseudo: "seller",
      email: "seller@example.com",
    });
    const buyer = await createUser({
      pseudo: "buyer",
      email: "buyer@example.com",
    });
    const stranger = await createUser({
      pseudo: "stranger",
      email: "stranger@example.com",
    });
    const productA = await createProduct(seller.token);
    const productB = await createProduct(seller.token);

    await request(app)
      .post("/api/payments/checkout-session")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: productA._id });
    await request(app)
      .post("/api/payments/checkout-session")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId: productB._id });

    const buyerOrders = await request(app)
      .get("/api/payments/orders")
      .set("Authorization", `Bearer ${buyer.token}`);
    const strangerOrders = await request(app)
      .get("/api/payments/orders")
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(buyerOrders.body.orders).toHaveLength(2);
    expect(buyerOrders.body.orders[0].seller.pseudo).toBe("seller");
    expect(strangerOrders.body.orders).toHaveLength(0);
  });
});

describe("POST /api/payments/webhook", () => {
  it("marks the matching order as paid when checkout.session.completed fires", async () => {
    const seller = await createUser({
      pseudo: "seller",
      email: "seller@example.com",
    });
    const buyer = await createUser({
      pseudo: "buyer",
      email: "buyer@example.com",
    });
    const product = await createProduct(seller.token);

    await Order.create({
      product: product._id,
      buyer: buyer.user.id,
      seller: seller.user.id,
      amountTotal: 950,
      stripeSessionId: "cs_test_webhook",
    });

    const fakeStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: "checkout.session.completed",
          data: { object: { id: "cs_test_webhook" } },
        }),
      },
    };
    getStripeClient.mockReturnValue(fakeStripe);

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "test-signature")
      .send(JSON.stringify({ type: "checkout.session.completed" }));

    expect(response.status).toBe(200);
    const order = await Order.findOne({ stripeSessionId: "cs_test_webhook" });
    expect(order.status).toBe("paid");
  });

  it("rejects a request with an invalid signature", async () => {
    const fakeStripe = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error("Invalid signature");
        }),
      },
    };
    getStripeClient.mockReturnValue(fakeStripe);

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "bad-signature")
      .send(JSON.stringify({ type: "checkout.session.completed" }));

    expect(response.status).toBe(400);
  });
});
