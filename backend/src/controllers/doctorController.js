const mongoose = require('mongoose');
const path      = require('path');
const fs        = require('fs/promises');
const Doctor    = require('../models/Doctor');

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function deleteFile(filename) {
  if (!filename) return;
  try {
    const filePath = path.join(__dirname, '../../uploads', filename);
    await fs.unlink(filePath);
  } catch {
    // File may already be gone — not a fatal error
  }
}

// @desc    Get all doctors
// @route   GET /api/doctors
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 }).lean();
    res.json(doctors);
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get single doctor
// @route   GET /api/doctors/:id
const getDoctorById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid doctor ID.' });
    }

    const Patient     = require('../models/Patient');
    const Appointment = require('../models/Appointment');
    const Session     = require('../models/Session');

    const [doctor, patients, appointments, sessions] = await Promise.all([
      Doctor.findById(req.params.id).lean(),
      Patient.find({ doctorId: req.params.id })
        .select('name diagnosis paymentStatus')
        .lean(),
      Appointment.find({ doctorId: req.params.id })
        .populate('patientId', 'name')
        .sort({ date: 1 })
        .limit(10)
        .lean(),
      Session.find({ doctorId: req.params.id })
        .populate('patientId', 'name')
        .sort({ date: -1 })
        .limit(10)
        .lean(),
    ]);

    if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });

    res.json({ ...doctor, patients, appointments, sessions });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Create doctor
// @route   POST /api/doctors
const createDoctor = async (req, res) => {
  try {
    const { name, specialization, phone, email } = req.body;

    if (!name || !specialization || !phone || !email) {
      return res.status(400).json({ message: 'name, specialization, phone and email are required.' });
    }

    const existing = await Doctor.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'A doctor with this email already exists.' });
    }

    const photo  = req.file ? req.file.filename : null;
    const doctor = await Doctor.create({ name, specialization, phone, email, photo });

    res.status(201).json({ message: 'Doctor created successfully.', doctor });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
const updateDoctor = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid doctor ID.' });
    }

    const { name, specialization, phone, email } = req.body;

    const existingDoctor = await Doctor.findById(req.params.id);
    if (!existingDoctor) return res.status(404).json({ message: 'Doctor not found.' });

    let photo = existingDoctor.photo;
    if (req.file) {
      await deleteFile(existingDoctor.photo);
      photo = req.file.filename;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { name, specialization, phone, email, photo },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Doctor updated successfully.', doctor });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete doctor
// @route   DELETE /api/doctors/:id
const deleteDoctor = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid doctor ID.' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });

    await deleteFile(doctor.photo);
    await doctor.deleteOne();

    res.json({ message: 'Doctor deleted successfully.' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor };
