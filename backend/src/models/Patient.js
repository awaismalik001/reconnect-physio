const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema(
  {
    name:             { type: String, required: true, trim: true },
    age:              { type: Number, required: true, min: 0, max: 150 },
    gender:           { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
    phone:            { type: String, required: true, trim: true },
    address:          { type: String, default: '' },
    diagnosis:        { type: String, required: true, trim: true },
    emergencyContact: { type: String, default: '' },
    emergencyPhone:   { type: String, default: '' },
    photo:            { type: String, default: null },
    totalSessions:    { type: Number, default: 0, min: 0 },
    startDate:        { type: Date, default: null },
    endDate:          { type: Date, default: null },
    paymentStatus:    { type: String, default: 'pending', enum: ['pending', 'paid', 'partial'] },
    doctorId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    doctorName:       { type: String, default: '' },
    therapyTypeIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'TherapyType' }],
  },
  { timestamps: true }
);

// Text index for fast search across name, phone, diagnosis
PatientSchema.index({ name: 'text', phone: 'text', diagnosis: 'text' });

module.exports = mongoose.model('Patient', PatientSchema);
