const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientName: { type: String, default: '' },
    doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor',  required: true },
    doctorName:  { type: String, default: '' },
    date:        { type: Date,   required: true },
    time:        { type: String, required: true, trim: true },
    status:      { type: String, default: 'scheduled', enum: ['scheduled', 'completed', 'cancelled', 'no-show'] },
    notes:       { type: String, default: '' },
    sessionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
