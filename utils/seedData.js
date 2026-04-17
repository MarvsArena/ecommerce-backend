import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDatabase from "../config/db.js";
import productSeeds from "../data/productSeeds.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

dotenv.config();

const seed = async () => {
  try {
    await connectDatabase({ exitOnFailure: false });
    console.log("Database connection ready for seeding");

    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@omdhairville.com";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

    console.log("Clearing existing sample products");
    await Product.deleteMany();

    let adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      adminUser = new User({
        name: "OMD Hairville Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      await adminUser.save();
      console.log(`Admin user created: ${adminUser.email}`);
    } else {
      adminUser.name = "OMD Hairville Admin";
      adminUser.role = "admin";
      adminUser.password = adminPassword;
      await adminUser.save();
      console.log(`Admin user updated: ${adminUser.email}`);
    }

    const insertedProducts = await Product.insertMany(productSeeds);
    console.log(`Inserted ${insertedProducts.length} sample products`);

    console.log("Seed completed successfully");
    console.log(`Admin email: ${adminUser.email}`);
    console.log(`Admin password: ${adminPassword}`);

    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Seed failed:", error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seed();
