const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    phone:          { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    photo:          { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', DoctorSchema);
