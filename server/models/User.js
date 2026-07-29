// server/models/User.js
const mongoose = require('mongoose');

const ALLOWED_ROLES = ['KAM', 'SALES_COORDINATOR', 'LINE_MANAGER', 'SUPER_ADMIN'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    initials: { type: String, required: true, trim: true, maxlength: 20 }, // e.g. KAM1, SC1, LM, Super Admin
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ALLOWED_ROLES },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ALLOWED_ROLES = ALLOWED_ROLES;