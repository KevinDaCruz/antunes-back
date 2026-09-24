import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStripeClient } from "../config/stripe.js";

export const createCheckoutSession = asyncHandler(
  async function createCheckoutSession(req, res) {
    const { productId } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError("Produit introuvable.", 404);
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new AppError("Produit introuvable.", 404);
    }

    if (product.seller.toString() === req.user._id.toString()) {
      throw new AppError("Tu ne peux pas acheter ta propre annonce.", 400);
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: product.name },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment-cancelled`,
      metadata: {
        productId: product._id.toString(),
        buyerId: req.user._id.toString(),
      },
    });

    await Order.create({
      product: product._id,
      buyer: req.user._id,
      seller: product.seller,
      amountTotal: product.price,
      stripeSessionId: session.id,
    });

    res.status(201).json({ url: session.url });
  },
);

export const handleStripeWebhook = asyncHandler(async function handleStripeWebhook(
  req,
  res,
) {
  const stripe = getStripeClient();
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    throw new AppError(`Signature webhook invalide : ${error.message}`, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await Order.findOneAndUpdate(
      { stripeSessionId: session.id },
      { status: "paid" },
    );
  }

  res.json({ received: true });
});

export const getOrderBySessionId = asyncHandler(
  async function getOrderBySessionId(req, res) {
    const order = await Order.findOne({
      stripeSessionId: req.params.sessionId,
      buyer: req.user._id,
    }).populate("product", "name imageUrl price");

    if (!order) {
      throw new AppError("Commande introuvable.", 404);
    }

    res.json({ order });
  },
);

export const listMyOrders = asyncHandler(async function listMyOrders(
  req,
  res,
) {
  const orders = await Order.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .populate("product", "name imageUrl price")
    .populate("seller", "pseudo");

  res.json({ orders });
});
