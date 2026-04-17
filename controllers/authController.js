import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";

const authResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  token: generateToken(user._id),
});

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!name?.trim() || !normalizedEmail || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
  });

  res.status(201).json(authResponse(user));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.status(200).json(authResponse(user));
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User profile not found");
  }

  res.status(200).json(authResponse(user));
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User profile not found");
  }

  const nextName = req.body.name?.trim();
  const nextEmail = req.body.email?.trim().toLowerCase();
  const nextPassword = req.body.password?.trim();

  if (nextEmail && nextEmail !== user.email) {
    const existingUser = await User.findOne({ email: nextEmail });

    if (existingUser && String(existingUser._id) !== String(user._id)) {
      res.status(409);
      throw new Error("An account with this email already exists");
    }

    user.email = nextEmail;
  }

  if (nextName) {
    user.name = nextName;
  }

  if (nextPassword) {
    if (nextPassword.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    user.password = nextPassword;
  }

  const updatedUser = await user.save();
  res.status(200).json(authResponse(updatedUser));
});
