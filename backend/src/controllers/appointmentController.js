const mongoose    = require('mongoose');
const Appointment = require('../models/Appointment');
const Patient     = require('../models/Patient');
const Doctor      = require('../models/Doctor');
const { formatDoc, formatDocs } = require('../utils/format');

// ── Helper ────────────────────────────────────────────────────────────────────

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// @desc    Get all appointments
// @route   GET /api/appointments
const getAllAppointments = async (req, res) => {
  try {
    const { date, doctorId, patientId, status } = req.query;

    const filter = {};
    if (status    && status !== 'all') filter.status    = status;
    if (doctorId  && isValidId(doctorId))  filter.doctorId  = doctorId;
    if (patientId && isValidId(patientId)) filter.patientId = patientId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name phone diagnosis')
      .populate('doctorId',  'name specialization')
      .sort({ date: 1, time: 1 })
      .lean();

    res.json(formatDocs(appointments));
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get today's appointments
// @route   GET /api/appointments/today
const getTodayAppointments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      date: { $gte: today, $lte: endOfDay },
    })
      .populate('patientId', 'name phone')
      .populate('doctorId',  'name specialization')
      .sort({ time: 1 })
      .lean();

    res.json(formatDocs(appointments));
  } catch (error) {
    console.error('Get today appointments error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Create appointment
// @route   POST /api/appointments
const createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, time, notes } = req.body;

    if (!patientId || !doctorId || !date || !time) {
      return res.status(400).json({ message: 'patientId, doctorId, date and time are required.' });
    }
    if (!isValidId(patientId) || !isValidId(doctorId)) {
      return res.status(400).json({ message: 'Invalid patientId or doctorId.' });
    }

    // Validate date cannot be before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apptDate = new Date(date);
    if (apptDate < today) {
      return res.status(400).json({ message: 'Appointment date cannot be in the past.' });
    }

    // Fetch patient and doctor to store names directly in database
    const [patient, doctor] = await Promise.all([
      Patient.findById(patientId),
      Doctor.findById(doctorId),
    ]);

    const appointment = await Appointment.create({
      patientId,
      patientName: patient ? patient.name : '',
      doctorId,
      doctorName:  doctor ? doctor.name : '',
      date: apptDate,
      time,
      notes: notes || '',
    });

    await appointment.populate([
      { path: 'patientId', select: 'name' },
      { path: 'doctorId',  select: 'name' },
    ]);

    res.status(201).json({ message: 'Appointment booked successfully.', appointment: formatDoc(appointment) });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
const updateAppointment = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    const { patientId, doctorId, date, time, status, notes } = req.body;

    const update = {};
    if (patientId && isValidId(patientId)) {
      update.patientId = patientId;
      const p = await Patient.findById(patientId);
      if (p) update.patientName = p.name;
    }
    if (doctorId && isValidId(doctorId)) {
      update.doctorId = doctorId;
      const d = await Doctor.findById(doctorId);
      if (d) update.doctorName = d.name;
    }
    if (date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDate = new Date(date);
      if (apptDate < today) {
        return res.status(400).json({ message: 'Appointment date cannot be in the past.' });
      }
      update.date = apptDate;
    }
    if (time)   update.time   = time;
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const appointment = await Appointment.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true,
    })
      .populate('patientId', 'name')
      .populate('doctorId',  'name');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

    res.json({ message: 'Appointment updated successfully.', appointment: formatDoc(appointment) });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
const deleteAppointment = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

    res.json({ message: 'Appointment deleted successfully.' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getAllAppointments,
  getTodayAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
