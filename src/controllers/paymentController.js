import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStripeClient } from "../config/stripe.js";
import { buildFrontendUrl } from "../utils/frontendUrl.js";
import { computeServiceFeeCents, toCents } from "../utils/pricing.js";
import { logger } from "../utils/logger.js";

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

    if (product.status === "sold") {
      throw new AppError("Cet article a déjà été vendu.", 409);
    }

    if (product.seller.toString() === req.user._id.toString()) {
      throw new AppError("Tu ne peux pas acheter ta propre annonce.", 400);
    }

    // Les montants viennent toujours de la base, jamais du client : un
    // utilisateur ne peut pas modifier le prix envoyé à Stripe.
    const priceCents = toCents(product.price);
    const serviceFeeCents = computeServiceFeeCents(priceCents);

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: product.name },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Frais de service (protection acheteur)" },
            unit_amount: serviceFeeCents,
          },
          quantity: 1,
        },
      ],
      success_url: buildFrontendUrl(
        "/payment-success?session_id={CHECKOUT_SESSION_ID}",
      ),
      cancel_url: buildFrontendUrl("/payment-cancelled"),
      metadata: {
        productId: product._id.toString(),
        buyerId: req.user._id.toString(),
      },
    });

    await Order.create({
      product: product._id,
      buyer: req.user._id,
      seller: product.seller,
      serviceFee: serviceFeeCents / 100,
      amountTotal: (priceCents + serviceFeeCents) / 100,
      stripeSessionId: session.id,
    });

    res.status(201).json({ url: session.url });
  },
);

async function markOrderAsPaid(sessionId) {
  const order = await Order.findOneAndUpdate(
    { stripeSessionId: sessionId },
    { status: "paid" },
    { new: true },
  );

  if (!order) {
    logger.warn("payment.order_not_found", { sessionId });
    return;
  }

  // Limite connue : si deux acheteurs paient le même article à quelques
  // secondes d'intervalle, les deux paiements aboutissent. Le second devra
  // être remboursé depuis le dashboard Stripe (cas rare sur des pièces
  // uniques, à traiter par un système de réservation dans une V2).
  await Product.findByIdAndUpdate(order.product, { status: "sold" });

  logger.info("payment.order_paid", { orderId: order._id.toString() });
}

async function markOrderAsFailed(sessionId) {
  await Order.findOneAndUpdate(
    { stripeSessionId: sessionId, status: "pending" },
    { status: "failed" },
  );
}

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
    logger.warn("payment.webhook_invalid_signature", { ip: req.ip });
    throw new AppError(`Signature webhook invalide : ${error.message}`, 400);
  }

  const session = event.data.object;

  switch (event.type) {
    case "checkout.session.completed":
      await markOrderAsPaid(session.id);
      break;
    // L'acheteur a abandonné la page de paiement : Stripe expire la
    // session au bout de 24 h et la commande ne doit plus rester "en attente".
    case "checkout.session.expired":
      await markOrderAsFailed(session.id);
      break;
    default:
      // Les autres événements Stripe ne concernent pas l'application.
      break;
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
