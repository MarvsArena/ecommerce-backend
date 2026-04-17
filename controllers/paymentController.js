import Order from "../models/Order.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  buildOrderFromItems,
  getDeliveryFee,
  normalizeShippingAddress,
  validateShippingAddress,
} from "../utils/orderUtils.js";

const paystackUrl = "https://api.paystack.co";

const paystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

const ensurePaystackSecret = () => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is required for payment initialization and verification");
  }
};

const decrementStock = async (orderItems) => {
  await Promise.all(
    orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      }),
    ),
  );
};

export const initializePayment = asyncHandler(async (req, res) => {
  ensurePaystackSecret();

  const { email, products, shippingAddress, deliveryMethod = "pickup" } = req.body;
  const normalizedAddress = normalizeShippingAddress(shippingAddress);

  if (!email) {
    res.status(400);
    throw new Error("Customer email is required");
  }

  validateShippingAddress(deliveryMethod, normalizedAddress);

  const { subtotal } = await buildOrderFromItems(products);
  const deliveryFee = getDeliveryFee(deliveryMethod);
  const totalPrice = subtotal + deliveryFee;
  const amountInKobo = Math.round(totalPrice * 100);

  const response = await fetch(`${paystackUrl}/transaction/initialize`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      email,
      amount: amountInKobo,
      currency: "NGN",
      callback_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/checkout`,
      metadata: {
        brand: "OMD Hairville",
        deliveryMethod,
        deliveryFee,
      },
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.status) {
    res.status(400);
    throw new Error(result.message || "Unable to initialize payment");
  }

  res.status(200).json({
    message: "Payment initialized successfully",
    totalPrice,
    ...result.data,
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  ensurePaystackSecret();

  const { reference, products, shippingAddress, deliveryMethod = "pickup" } = req.body;
  const normalizedAddress = normalizeShippingAddress(shippingAddress);

  if (!reference) {
    res.status(400);
    throw new Error("Payment reference is required");
  }

  const existingOrder = await Order.findOne({ paymentReference: reference });

  if (existingOrder) {
    return res.status(200).json(existingOrder);
  }

  validateShippingAddress(deliveryMethod, normalizedAddress);

  const response = await fetch(`${paystackUrl}/transaction/verify/${reference}`, {
    method: "GET",
    headers: paystackHeaders(),
  });

  const result = await response.json();

  if (!response.ok || !result.status || result.data?.status !== "success") {
    res.status(400);
    throw new Error(result.message || "Payment verification failed");
  }

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
    paymentStatus: "paid",
    orderStatus: "processing",
    paymentReference: reference,
    paidAt: new Date(),
  });

  await decrementStock(orderItems);

  res.status(201).json(order);
});
