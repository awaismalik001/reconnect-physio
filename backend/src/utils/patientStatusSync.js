const mongoose = require('mongoose');

// Helper to check if a patient has completed all their planned sessions
// and made all payments, and if so, updates their paymentStatus to 'paid'.
async function syncPatientPaymentStatus(patientId) {
  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) return null;

  const Patient = require('../models/Patient');
  const Session = require('../models/Session');
  const Finance = require('../models/Finance');

  const patient = await Patient.findById(patientId);
  if (!patient) return null;

  const totalPlanned = patient.totalSessions || 0;
  const sessionCount = await Session.countDocuments({ patientId });

  // Count sessions with unpaid status ('credit' or 'pending')
  const unpaidSessions = await Session.countDocuments({
    patientId,
    paymentStatus: { $in: ['credit', 'pending'] },
  });

  // Count unpaid credit records in Finance
  const unpaidCredits = await Finance.countDocuments({
    patientId,
    type: 'credit',
    isPaid: false,
  });

  let newStatus = patient.paymentStatus;

  // Condition 1: Completed all planned sessions
  const allSessionsCompleted = totalPlanned > 0 ? sessionCount >= totalPlanned : sessionCount > 0;
  // Condition 2: All payments made (no unpaid credits or pending sessions)
  const allPaymentsMade = unpaidSessions === 0 && unpaidCredits === 0 && sessionCount > 0;

  if (allSessionsCompleted && allPaymentsMade) {
    newStatus = 'paid';
  } else if (unpaidCredits > 0 || unpaidSessions > 0) {
    newStatus = sessionCount > 0 ? 'partial' : 'pending';
  } else if (sessionCount > 0 && !allSessionsCompleted) {
    newStatus = 'partial';
  }

  if (newStatus !== patient.paymentStatus) {
    patient.paymentStatus = newStatus;
    await patient.save();
  }

  return patient;
}

module.exports = { syncPatientPaymentStatus };
