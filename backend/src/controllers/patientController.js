const mongoose   = require('mongoose');
const path       = require('path');
const fs         = require('fs/promises');
const Patient    = require('../models/Patient');
const Document   = require('../models/Document');
const { formatDoc, formatDocs } = require('../utils/format');

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function deleteFile(filename) {
  if (!filename) return;
  try {
    await fs.unlink(path.join(__dirname, '../../uploads', filename));
  } catch {
    // File may already be gone — not a fatal error
  }
}

// @desc    Get all patients
// @route   GET /api/patients
const getAllPatients = async (req, res) => {
  try {
    const { search, paymentStatus } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name:      { $regex: search, $options: 'i' } },
        { phone:     { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } },
      ];
    }
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const patients = await Patient.find(filter)
      .populate('doctorId',      'id name specialization')
      .populate('therapyTypeIds', 'id name')
      .sort({ createdAt: -1 })
      .lean();

    const Session     = require('../models/Session');
    const Appointment = require('../models/Appointment');

    const patientIds = patients.map((p) => p._id);
    const [sessionCounts, apptCounts, docCounts] = await Promise.all([
      Session.aggregate([{ $match: { patientId: { $in: patientIds } } }, { $group: { _id: '$patientId', count: { $sum: 1 } } }]),
      Appointment.aggregate([{ $match: { patientId: { $in: patientIds } } }, { $group: { _id: '$patientId', count: { $sum: 1 } } }]),
      Document.aggregate([{ $match: { patientId: { $in: patientIds } } }, { $group: { _id: '$patientId', count: { $sum: 1 } } }]),
    ]);

    const sMap = Object.fromEntries(sessionCounts.map((c) => [String(c._id), c.count]));
    const aMap = Object.fromEntries(apptCounts.map((c) => [String(c._id), c.count]));
    const dMap = Object.fromEntries(docCounts.map((c) => [String(c._id), c.count]));

    const formatted = formatDocs(patients).map((p) => ({
      ...p,
      _count: {
        sessions: sMap[String(p.id)] || 0,
        appointments: aMap[String(p.id)] || 0,
        documents: dMap[String(p.id)] || 0,
      },
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get single patient with full detail
// @route   GET /api/patients/:id
const getPatientById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid patient ID.' });
    }

    const Session     = require('../models/Session');
    const Appointment = require('../models/Appointment');
    const Finance     = require('../models/Finance');

    const [patient, sessions, appointments, documents, finances] = await Promise.all([
      Patient.findById(req.params.id)
        .populate('doctorId',      'name specialization phone email')
        .populate('therapyTypeIds', 'name description')
        .lean(),
      Session.find({ patientId: req.params.id })
        .populate('doctorId',      'name')
        .populate('therapyTypeId', 'name')
        .sort({ date: -1 })
        .lean(),
      Appointment.find({ patientId: req.params.id })
        .populate('doctorId', 'name')
        .sort({ date: 1 })
        .lean(),
      Document.find({ patientId: req.params.id }).sort({ createdAt: -1 }).lean(),
      Finance.find({ patientId: req.params.id }).sort({ date: -1 }).lean(),
    ]);

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const formattedPatient = formatDoc(patient);
    res.json({
      ...formattedPatient,
      sessions: formatDocs(sessions),
      appointments: formatDocs(appointments),
      documents: formatDocs(documents),
      finances: formatDocs(finances),
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Create patient
// @route   POST /api/patients
const createPatient = async (req, res) => {
  try {
    const {
      name, age, gender, phone, address, diagnosis,
      emergencyContact, emergencyPhone, doctorId,
      totalSessions, startDate, endDate, therapyTypeIds,
    } = req.body;

    if (!name || !age || !gender || !phone || !diagnosis) {
      return res.status(400).json({ message: 'name, age, gender, phone and diagnosis are required.' });
    }

    const photo = req.file ? req.file.filename : null;

    // Parse therapyTypeIds (may arrive as JSON string from FormData)
    let parsedTherapyIds = [];
    if (therapyTypeIds) {
      const ids = Array.isArray(therapyTypeIds) ? therapyTypeIds : JSON.parse(therapyTypeIds);
      parsedTherapyIds = ids.filter(isValidId);
    }

    const patient = await Patient.create({
      name,
      age:             parseInt(age),
      gender,
      phone,
      address:         address || '',
      diagnosis,
      emergencyContact: emergencyContact || '',
      emergencyPhone:   emergencyPhone   || '',
      doctorId:        doctorId && isValidId(doctorId) ? doctorId : null,
      totalSessions:   totalSessions ? parseInt(totalSessions) : 0,
      startDate:       startDate ? new Date(startDate) : null,
      endDate:         endDate   ? new Date(endDate)   : null,
      therapyTypeIds:  parsedTherapyIds,
      photo,
    });

    await patient.populate(['doctorId', 'therapyTypeIds']);

    res.status(201).json({ message: 'Patient created successfully.', patient: formatDoc(patient) });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
const updatePatient = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid patient ID.' });
    }

    const {
      name, age, gender, phone, address, diagnosis,
      emergencyContact, emergencyPhone, doctorId,
      totalSessions, startDate, endDate, paymentStatus, therapyTypeIds,
    } = req.body;

    const existingPatient = await Patient.findById(req.params.id);
    if (!existingPatient) return res.status(404).json({ message: 'Patient not found.' });

    // Handle photo update
    let photo = existingPatient.photo;
    if (req.file) {
      await deleteFile(existingPatient.photo);
      photo = req.file.filename;
    }

    // Build update object — only include defined fields
    const update = {};
    if (name            !== undefined) update.name            = name;
    if (age             !== undefined) update.age             = parseInt(age);
    if (gender          !== undefined) update.gender          = gender;
    if (phone           !== undefined) update.phone           = phone;
    if (address         !== undefined) update.address         = address;
    if (diagnosis       !== undefined) update.diagnosis       = diagnosis;
    if (emergencyContact !== undefined) update.emergencyContact = emergencyContact;
    if (emergencyPhone  !== undefined) update.emergencyPhone  = emergencyPhone;
    if (doctorId        !== undefined) update.doctorId        = doctorId && isValidId(doctorId) ? doctorId : null;
    if (totalSessions   !== undefined) update.totalSessions   = parseInt(totalSessions);
    if (startDate       !== undefined) update.startDate       = startDate ? new Date(startDate) : null;
    if (endDate         !== undefined) update.endDate         = endDate   ? new Date(endDate)   : null;
    if (paymentStatus   !== undefined) update.paymentStatus   = paymentStatus;
    update.photo = photo;

    if (therapyTypeIds !== undefined) {
      const ids = Array.isArray(therapyTypeIds) ? therapyTypeIds : JSON.parse(therapyTypeIds);
      update.therapyTypeIds = ids.filter(isValidId);
    }

    const patient = await Patient.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true,
    }).populate(['doctorId', 'therapyTypeIds']);

    res.json({ message: 'Patient updated successfully.', patient: formatDoc(patient) });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
const deletePatient = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid patient ID.' });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    await deleteFile(patient.photo);

    // Cascade-delete associated records
    const Session     = require('../models/Session');
    const Appointment = require('../models/Appointment');
    const Finance     = require('../models/Finance');

    await Promise.all([
      Session.deleteMany({ patientId: req.params.id }),
      Appointment.deleteMany({ patientId: req.params.id }),
      Document.deleteMany({ patientId: req.params.id }),
      Finance.deleteMany({ patientId: req.params.id }),
      patient.deleteOne(),
    ]);

    res.json({ message: 'Patient deleted successfully.' });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Upload document for patient
// @route   POST /api/patients/:id/documents
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid patient ID.' });

    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const document = await Document.create({
      patientId:    req.params.id,
      filename:     req.file.filename,
      originalName: req.file.originalname,
      fileType:     req.file.mimetype,
      fileSize:     req.file.size,
    });

    res.status(201).json({ message: 'Document uploaded successfully.', document: formatDoc(document) });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete document
// @route   DELETE /api/patients/documents/:docId
const deleteDocument = async (req, res) => {
  try {
    if (!isValidId(req.params.docId)) return res.status(400).json({ message: 'Invalid document ID.' });

    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    await deleteFile(doc.filename);
    await doc.deleteOne();

    res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  uploadDocument,
  deleteDocument,
};
