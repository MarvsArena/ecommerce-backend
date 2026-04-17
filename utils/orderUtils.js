import Product from "../models/Product.js";

export const DELIVERY_FEE = 2500;

const requiredDeliveryFields = ["address", "city", "state", "phone"];

export const normalizeShippingAddress = (shippingAddress = {}) => ({
  address: shippingAddress.address?.trim?.() || "",
  city: shippingAddress.city?.trim?.() || "",
  state: shippingAddress.state?.trim?.() || "",
  phone: shippingAddress.phone?.trim?.() || "",
});

export const getDeliveryFee = (deliveryMethod = "pickup") =>
  deliveryMethod === "delivery" ? DELIVERY_FEE : 0;

export const validateShippingAddress = (deliveryMethod = "pickup", shippingAddress = {}) => {
  if (deliveryMethod === "pickup") {
    return;
  }

  if (deliveryMethod !== "delivery") {
    throw new Error('Delivery method must be either "pickup" or "delivery"');
  }

  const normalizedAddress = normalizeShippingAddress(shippingAddress);
  const missingField = requiredDeliveryFields.find((field) => !normalizedAddress[field]);

  if (missingField) {
    throw new Error(`Shipping field "${missingField}" is required for delivery`);
  }
};

export const buildOrderFromItems = async (items = []) => {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("At least one product is required");
  }

  const itemIds = items.map((item) => item.product || item._id);
  const products = await Product.find({ _id: { $in: itemIds } });
  const productMap = new Map(products.map((product) => [product.id, product]));

  const orderItems = items.map((item) => {
    const product = productMap.get(String(item.product || item._id));

    if (!product) {
      throw new Error("One or more selected products could not be found");
    }

    const quantity = Number(item.quantity || 1);

    if (quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    if (quantity > product.stock) {
      throw new Error(`${product.name} does not have enough stock`);
    }

    return {
      product: product._id,
      name: product.name,
      image: product.images[0],
      price: product.price,
      quantity,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return { orderItems, subtotal };
};
