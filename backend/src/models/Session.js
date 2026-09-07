const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema(
  {
    patientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient',     required: true },
    patientName:     { type: String, default: '' },
    doctorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor',      required: true },
    doctorName:      { type: String, default: '' },
    therapyTypeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'TherapyType', default: null },
    therapyTypeName: { type: String, default: '' },
    appointmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    date:            { type: Date,   required: true },
    duration:        { type: Number, required: true, min: 1 }, // minutes
    notes:           { type: String, default: '' },
    progress:        { type: String, default: '' },
    nextSteps:       { type: String, default: '' },
    paymentAmount:   { type: Number, default: 0, min: 0 },
    paymentMethod:   { type: String, default: 'cash', enum: ['cash', 'card', 'bank_transfer', 'other'] },
    paymentStatus:   { type: String, default: 'pending', enum: ['paid', 'credit', 'pending'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', SessionSchema);
