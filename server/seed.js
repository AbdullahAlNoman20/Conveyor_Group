// server/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");

// 4 core roles per updated requirement  extend this array as new hires join
const CORE_USERS = [
  {
    name: "Atik Al Sabbir",
    initials: "KAM1",
    email: "kam1@milex.com",
    role: "KAM",
    password: "ChangeMe123!",
  },
  {
    name: "Mustair Billa",
    initials: "SC1",
    email: "sc1@milex.com",
    role: "SALES_COORDINATOR",
    password: "ChangeMe123!",
  },
  {
    name: "King Fahad",
    initials: "LM",
    email: "lm@milex.com",
    role: "LINE_MANAGER",
    password: "ChangeMe123!",
  },
  {
    name: "Head Of IT",
    initials: "Super Admin",
    email: "superadmin@milex.com",
    role: "SUPER_ADMIN",
    password: "ChangeMe123!",
  },
];

(async () => {
  await connectDB();

  for (const u of CORE_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`Skip (already exists): ${u.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 12);
    await User.create({
      name: u.name,
      initials: u.initials,
      email: u.email,
      role: u.role,
      passwordHash,
    });
    console.log(`Created: ${u.email} (${u.role})`);
  }

  await mongoose.disconnect();
  console.log("Seed complete.");
})();
