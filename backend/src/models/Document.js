const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    patientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientName:  { type: String, default: '' },
    filename:     { type: String, required: true },
    originalName: { type: String, required: true },
    fileType:     { type: String, required: true },
    fileSize:     { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', DocumentSchema);
