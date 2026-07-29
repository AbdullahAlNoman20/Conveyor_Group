// server/seed-extra.js
// Use this to add MORE users of an existing role later (e.g. KAM2, SC2)
// without touching seed.js. Run: node seed-extra.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const { ALLOWED_ROLES } = require('./models/User');

// Edit this array each time you onboard a new team member
const NEW_USERS = [
  // { name: 'New KAM Name', initials: 'KAM2', email: 'kam2@milex.com', role: 'KAM', password: 'ChangeMe123!' },
];

(async () => {
  await connectDB();

  for (const u of NEW_USERS) {
    if (!ALLOWED_ROLES.includes(u.role)) {
      console.warn(`Skip invalid role for ${u.email}: ${u.role}`);
      continue;
    }
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`Skip (already exists): ${u.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 12);
    await User.create({ name: u.name, initials: u.initials, email: u.email, role: u.role, passwordHash });
    console.log(`Created: ${u.email} (${u.role})`);
  }

  await mongoose.disconnect();
  console.log('Extra seed complete.');
})();