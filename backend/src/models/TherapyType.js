const mongoose = require('mongoose');

const TherapyTypeSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TherapyType', TherapyTypeSchema);
