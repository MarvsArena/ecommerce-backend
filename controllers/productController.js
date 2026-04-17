import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadImages } from "../utils/imageUpload.js";

const parseImageUrls = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(value)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
};

const parseProductPayload = async (req) => {
  const uploadedImages = await uploadImages(req.files || []);
  const urlImages = parseImageUrls(req.body.imageUrls);

  return {
    name: req.body.name,
    description: req.body.description,
    price: Number(req.body.price),
    category: req.body.category,
    stock: Number(req.body.stock),
    featured: String(req.body.featured) === "true" || req.body.featured === true,
    texture: req.body.texture || "",
    length: req.body.length || "",
    capType: req.body.capType || "",
    images: [...urlImages, ...uploadedImages],
  };
};

export const getProducts = asyncHandler(async (req, res) => {
  const { search = "", category, featured, limit } = req.query;

  const query = {};

  if (category && category !== "All") {
    query.category = category;
  }

  if (featured === "true") {
    query.featured = true;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  let productsQuery = Product.find(query).sort({ createdAt: -1 });

  if (limit) {
    productsQuery = productsQuery.limit(Number(limit));
  }

  const products = await productsQuery;
  res.status(200).json(products);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.status(200).json(product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const payload = await parseProductPayload(req);

  if (!payload.name || !payload.description || !payload.category || !payload.images.length) {
    res.status(400);
    throw new Error("Name, description, category, and at least one image are required");
  }

  const product = await Product.create(payload);
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const payload = await parseProductPayload(req);
  const hasNewImages = payload.images.length > 0;

  Object.assign(product, {
    name: payload.name || product.name,
    description: payload.description || product.description,
    price: Number.isNaN(payload.price) ? product.price : payload.price,
    category: payload.category || product.category,
    stock: Number.isNaN(payload.stock) ? product.stock : payload.stock,
    featured: typeof req.body.featured === "undefined" ? product.featured : payload.featured,
    texture: payload.texture || product.texture,
    length: payload.length || product.length,
    capType: payload.capType || product.capType,
    images: hasNewImages ? payload.images : product.images,
  });

  const updatedProduct = await product.save();
  res.status(200).json(updatedProduct);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await product.deleteOne();
  res.status(200).json({ message: "Product deleted successfully" });
});
