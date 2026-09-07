const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name:     { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);
