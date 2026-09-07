const mongoose = require('mongoose');

const FinanceSchema = new mongoose.Schema(
  {
    type:          { type: String, required: true, enum: ['income', 'expense', 'credit'] },
    amount:        { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: null },
    category:      { type: String, required: true, trim: true },
    description:   { type: String, required: true, trim: true },
    patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
    sessionId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null, unique: true, sparse: true },
    isPaid:        { type: Boolean, default: false },
    paidAt:        { type: Date,    default: null },
    date:          { type: Date,    default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Finance', FinanceSchema);
