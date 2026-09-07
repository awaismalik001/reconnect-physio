// Helper to ensure MongoDB documents serialize with both `id` and `_id`,
// and with relation aliases (`doctor`, `patient`, `therapyType`, `session`)
// so the frontend receives the exact shape it expects.

function formatDoc(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : { ...doc };
  
  if (obj._id && !obj.id) {
    obj.id = obj._id.toString();
  }

  // Alias doctorId -> doctor
  if (obj.doctorId && typeof obj.doctorId === 'object') {
    obj.doctor = {
      ...obj.doctorId,
      id: obj.doctorId._id ? obj.doctorId._id.toString() : obj.doctorId.id,
    };
  }

  // Alias patientId -> patient
  if (obj.patientId && typeof obj.patientId === 'object') {
    obj.patient = {
      ...obj.patientId,
      id: obj.patientId._id ? obj.patientId._id.toString() : obj.patientId.id,
    };
  }

  // Alias therapyTypeId -> therapyType
  if (obj.therapyTypeId && typeof obj.therapyTypeId === 'object') {
    obj.therapyType = {
      ...obj.therapyTypeId,
      id: obj.therapyTypeId._id ? obj.therapyTypeId._id.toString() : obj.therapyTypeId.id,
    };
  }

  // Alias sessionId -> session
  if (obj.sessionId && typeof obj.sessionId === 'object') {
    obj.session = {
      ...obj.sessionId,
      id: obj.sessionId._id ? obj.sessionId._id.toString() : obj.sessionId.id,
    };
  }

  // Alias appointmentId -> appointment
  if (obj.appointmentId && typeof obj.appointmentId === 'object') {
    obj.appointment = {
      ...obj.appointmentId,
      id: obj.appointmentId._id ? obj.appointmentId._id.toString() : obj.appointmentId.id,
    };
  }

  return obj;
}

function formatDocs(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.map(formatDoc);
}

module.exports = { formatDoc, formatDocs };
