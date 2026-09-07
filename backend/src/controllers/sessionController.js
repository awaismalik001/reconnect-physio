const mongoose     = require('mongoose');
const Session      = require('../models/Session');
const Finance      = require('../models/Finance');
const Appointment  = require('../models/Appointment');
const TherapyType  = require('../models/TherapyType');
const { formatDoc, formatDocs } = require('../utils/format');

// ── Helper ────────────────────────────────────────────────────────────────────

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// @desc    Get all sessions
// @route   GET /api/sessions
const getAllSessions = async (req, res) => {
  try {
    const { patientId, doctorId } = req.query;

    const filter = {};
    if (patientId && isValidId(patientId)) filter.patientId = patientId;
    if (doctorId  && isValidId(doctorId))  filter.doctorId  = doctorId;

    const sessions = await Session.find(filter)
      .populate('patientId',     'name')
      .populate('doctorId',      'name specialization')
      .populate('therapyTypeId', 'name')
      .populate('appointmentId', 'date time')
      .sort({ date: -1 })
      .lean();

    // Attach finance record for each session
    const sessionIds = sessions.map((s) => s._id);
    const finances   = await Finance.find({ sessionId: { $in: sessionIds } })
      .select('sessionId isPaid paidAt')
      .lean();
    const financeMap = Object.fromEntries(finances.map((f) => [String(f.sessionId), f]));

    const result = sessions.map((s) => ({
      ...formatDoc(s),
      financeRecord: financeMap[String(s._id)] || null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get single session
// @route   GET /api/sessions/:id
const getSessionById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID.' });
    }

    const [session, financeRecord] = await Promise.all([
      Session.findById(req.params.id)
        .populate('patientId',     'name')
        .populate('doctorId',      'name')
        .populate('therapyTypeId')
        .populate('appointmentId')
        .lean(),
      Finance.findOne({ sessionId: req.params.id }).lean(),
    ]);

    if (!session) return res.status(404).json({ message: 'Session not found.' });

    res.json({ ...formatDoc(session), financeRecord });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Create session — auto-creates Finance record and links Appointment
// @route   POST /api/sessions
const createSession = async (req, res) => {
  try {
    const {
      patientId, doctorId, therapyTypeId, appointmentId,
      date, duration, notes, progress, nextSteps,
      paymentAmount, paymentMethod, paymentStatus,
    } = req.body;

    if (!patientId || !doctorId || !date || !duration) {
      return res.status(400).json({ message: 'patientId, doctorId, date and duration are required.' });
    }
    if (!isValidId(patientId) || !isValidId(doctorId)) {
      return res.status(400).json({ message: 'Invalid patientId or doctorId.' });
    }

    const amount = parseFloat(paymentAmount) || 0;
    const status = paymentStatus || 'pending';

    const session = await Session.create({
      patientId,
      doctorId,
      therapyTypeId: therapyTypeId && isValidId(therapyTypeId) ? therapyTypeId : null,
      appointmentId: appointmentId && isValidId(appointmentId) ? appointmentId : null,
      date:          new Date(date),
      duration:      parseInt(duration),
      notes:         notes     || '',
      progress:      progress  || '',
      nextSteps:     nextSteps || '',
      paymentAmount: amount,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: status,
    });

    await session.populate([
      { path: 'patientId',     select: 'name' },
      { path: 'doctorId',      select: 'name' },
      { path: 'therapyTypeId' },
      { path: 'appointmentId', select: 'date time' },
    ]);

    // Auto-create Finance record for paid or credit sessions
    let financeRecord = null;
    if (amount > 0 && (status === 'paid' || status === 'credit')) {
      financeRecord = await Finance.create({
        type:          status === 'paid' ? 'income' : 'credit',
        amount,
        paymentMethod: status === 'paid' ? (paymentMethod || 'cash') : null,
        category:      'session',
        description:   `${status === 'credit' ? '[CREDIT] ' : ''}Session - ${session.patientId.name}`,
        patientId:     session.patientId._id,
        sessionId:     session._id,
        isPaid:        status === 'paid',
        paidAt:        status === 'paid' ? new Date() : null,
        date:          session.date,
      });
    }

    // Mark linked appointment as completed
    if (appointmentId && isValidId(appointmentId)) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: 'completed', sessionId: session._id });
    }

    res.status(201).json({ message: 'Session recorded successfully.', session: formatDoc(session), financeRecord });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update session
// @route   PUT /api/sessions/:id
const updateSession = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID.' });
    }

    const {
      patientId, doctorId, therapyTypeId, appointmentId,
      date, duration, notes, progress, nextSteps,
      paymentAmount, paymentMethod, paymentStatus,
    } = req.body;

    const update = {};
    if (patientId     && isValidId(patientId))     update.patientId     = patientId;
    if (doctorId      && isValidId(doctorId))      update.doctorId      = doctorId;
    if (therapyTypeId !== undefined) update.therapyTypeId = therapyTypeId && isValidId(therapyTypeId) ? therapyTypeId : null;
    if (appointmentId !== undefined) update.appointmentId = appointmentId && isValidId(appointmentId) ? appointmentId : null;
    if (date)          update.date          = new Date(date);
    if (duration)      update.duration      = parseInt(duration);
    if (notes         !== undefined) update.notes      = notes;
    if (progress      !== undefined) update.progress   = progress;
    if (nextSteps     !== undefined) update.nextSteps  = nextSteps;
    if (paymentAmount !== undefined) update.paymentAmount = parseFloat(paymentAmount);
    if (paymentMethod !== undefined) update.paymentMethod = paymentMethod;
    if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;

    const session = await Session.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true,
    })
      .populate('patientId',     'name')
      .populate('doctorId',      'name')
      .populate('therapyTypeId')
      .populate('appointmentId');

    if (!session) return res.status(404).json({ message: 'Session not found.' });

    // If the session was just marked paid, update its linked finance record
    if (paymentStatus === 'paid') {
      await Finance.findOneAndUpdate(
        { sessionId: req.params.id, isPaid: false },
        { type: 'income', isPaid: true, paidAt: new Date(), paymentMethod: paymentMethod || 'cash' }
      );
    }

    res.json({ message: 'Session updated successfully.', session: formatDoc(session) });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
const deleteSession = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID.' });
    }

    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    // Delete linked finance record
    await Finance.deleteOne({ sessionId: req.params.id });

    res.json({ message: 'Session deleted successfully.' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Mark a credit session as paid
// @route   PUT /api/sessions/:id/mark-paid
const markSessionPaid = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID.' });
    }

    const { paymentMethod } = req.body;
    const method = paymentMethod || 'cash';

    const [session] = await Promise.all([
      Session.findByIdAndUpdate(
        req.params.id,
        { paymentStatus: 'paid', paymentMethod: method },
        { new: true }
      ),
      Finance.findOneAndUpdate(
        { sessionId: req.params.id },
        {
          type: 'income',
          isPaid: true,
          paidAt: new Date(),
          paymentMethod: method,
          $unset: {},
        }
      ),
    ]);

    if (!session) return res.status(404).json({ message: 'Session not found.' });

    res.json({ message: 'Session marked as paid. Finance record updated.' });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get all therapy types
// @route   GET /api/sessions/therapy-types
const getTherapyTypes = async (req, res) => {
  try {
    const types = await TherapyType.find().sort({ name: 1 }).lean();
    res.json(formatDocs(types));
  } catch (error) {
    console.error('Get therapy types error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Create therapy type
// @route   POST /api/sessions/therapy-types
const createTherapyType = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required.' });

    const type = await TherapyType.create({ name, description: description || '' });
    res.status(201).json({ message: 'Therapy type created.', type: formatDoc(type) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A therapy type with this name already exists.' });
    }
    console.error('Create therapy type error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  markSessionPaid,
  getTherapyTypes,
  createTherapyType,
};
