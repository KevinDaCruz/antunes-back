import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function isParticipant(conversation, userId) {
  return conversation.participants.some(
    (participantId) => participantId.toString() === userId.toString(),
  );
}

async function findConversationForParticipant(conversationId, userId) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError("Conversation introuvable.", 404);
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation introuvable.", 404);
  }

  if (!isParticipant(conversation, userId)) {
    throw new AppError("Accès refusé à cette conversation.", 403);
  }

  return conversation;
}

export const listConversations = asyncHandler(async function listConversations(
  req,
  res,
) {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate("participants", "pseudo")
    .populate("product", "name imageUrl")
    .sort({ updatedAt: -1 });

  res.json({ conversations });
});

export const getConversation = asyncHandler(async function getConversation(
  req,
  res,
) {
  const conversation = await findConversationForParticipant(
    req.params.id,
    req.user._id,
  );

  await conversation.populate("participants", "pseudo");
  await conversation.populate("product", "name imageUrl");

  res.json({ conversation });
});

export const startConversation = asyncHandler(async function startConversation(
  req,
  res,
) {
  const { productId, content } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Produit introuvable.", 404);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Produit introuvable.", 404);
  }

  if (product.seller.toString() === req.user._id.toString()) {
    throw new AppError(
      "Tu ne peux pas démarrer une conversation sur ta propre annonce.",
      400,
    );
  }

  let conversation = await Conversation.findOne({
    product: productId,
    participants: { $all: [req.user._id, product.seller] },
  });

  if (!conversation) {
    conversation = new Conversation({
      product: productId,
      participants: [req.user._id, product.seller],
      messages: [],
    });
  }

  conversation.messages.push({ sender: req.user._id, content });
  await conversation.save();
  await conversation.populate("participants", "pseudo");
  await conversation.populate("product", "name imageUrl");

  res.status(201).json({ conversation });
});

export const sendMessage = asyncHandler(async function sendMessage(req, res) {
  const conversation = await findConversationForParticipant(
    req.params.id,
    req.user._id,
  );

  conversation.messages.push({ sender: req.user._id, content: req.body.content });
  await conversation.save();
  await conversation.populate("participants", "pseudo");
  await conversation.populate("product", "name imageUrl");

  res.status(201).json({ conversation });
});
