import Order from "../models/Order.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  buildOrderFromItems,
  getDeliveryFee,
  normalizeShippingAddress,
  validateShippingAddress,
} from "../utils/orderUtils.js";

const reduceProductStock = async (orderItems) => {
  await Promise.all(
    orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock: -item.quantity,
        },
      }),
    ),
  );
};

export const createOrder = asyncHandler(async (req, res) => {
  const { products, shippingAddress, deliveryMethod = "pickup" } = req.body;
  const normalizedAddress = normalizeShippingAddress(shippingAddress);
  const paymentStatus = req.body.paymentStatus || "pending";

  validateShippingAddress(deliveryMethod, normalizedAddress);

  const { orderItems, subtotal } = await buildOrderFromItems(products);
  const deliveryFee = getDeliveryFee(deliveryMethod);
  const totalPrice = subtotal + deliveryFee;

  const order = await Order.create({
    user: req.user._id,
    products: orderItems,
    totalPrice,
    deliveryMethod,
    deliveryFee,
    shippingAddress: deliveryMethod === "delivery" ? normalizedAddress : {},
    paymentStatus,
    orderStatus: req.body.orderStatus || (paymentStatus === "paid" ? "processing" : "pending"),
    paymentReference: req.body.paymentReference || "",
    paidAt: paymentStatus === "paid" ? new Date() : undefined,
  });

  if (order.paymentStatus === "paid") {
    await reduceProductStock(orderItems);
  }

  res.status(201).json(order);
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(orders);
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.orderStatus = req.body.orderStatus || order.orderStatus;
  order.paymentStatus = req.body.paymentStatus || order.paymentStatus;

  if (req.body.paymentStatus === "paid" && !order.paidAt) {
    order.paidAt = new Date();
  }

  const updatedOrder = await order.save();
  res.status(200).json(updatedOrder);
});
