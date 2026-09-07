const mongoose          = require('mongoose');
const Finance           = require('../models/Finance');
const Session           = require('../models/Session');
const generateInvoicePDF = require('../utils/pdfGenerator');
const { formatDoc, formatDocs } = require('../utils/format');
const { syncPatientPaymentStatus } = require('../utils/patientStatusSync');

// ── Helper ────────────────────────────────────────────────────────────────────

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// @desc    Get all finance records
// @route   GET /api/finance
const getAllFinance = async (req, res) => {
  try {
    const { type, category, startDate, endDate } = req.query;

    const filter = {};
    if (type)     filter.type     = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const records = await Finance.find(filter)
      .populate('patientId', 'name')
      .populate('sessionId', 'date duration')
      .sort({ date: -1 })
      .lean();

    res.json(formatDocs(records));
  } catch (error) {
    console.error('Get finance error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get finance dashboard summary
// @route   GET /api/finance/summary
const getFinanceSummary = async (req, res) => {
  try {
    const { period } = req.query; // daily | weekly | monthly

    const startDate = new Date();
    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // monthly (default)
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Run all aggregations + counts concurrently
    const [periodAgg, creditAgg, totalPatients, todayAppointments] = await Promise.all([
      Finance.aggregate([
        { $match: { date: { $gte: startDate } } },
        { $group: {
          _id:           '$type',
          total:         { $sum: '$amount' },
        }},
      ]),
      Finance.aggregate([
        { $match: { type: 'credit', isPaid: false } },
        { $group: {
          _id:            null,
          totalOutstanding: { $sum: '$amount' },
          count:            { $sum: 1 },
          patientIds:       { $addToSet: '$patientId' },
        }},
      ]),
      require('../models/Patient').countDocuments(),
      require('../models/Appointment').countDocuments({ date: { $gte: today, $lte: endOfToday } }),
    ]);

    // Map aggregation results
    const byType      = Object.fromEntries(periodAgg.map((r) => [r._id, r.total]));
    const creditData  = creditAgg[0] || { totalOutstanding: 0, count: 0, patientIds: [] };

    res.json({
      totalIncome:          byType.income  || 0,
      totalExpenses:        byType.expense || 0,
      netProfit:           (byType.income  || 0) - (byType.expense || 0),
      totalCreditOutstanding: creditData.totalOutstanding,
      creditCount:          creditData.count,
      creditPatients:       creditData.patientIds.filter(Boolean).length,
      totalPatients,
      todayAppointments,
      period: period || 'monthly',
    });
  } catch (error) {
    console.error('Finance summary error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get all credit records
// @route   GET /api/finance/credits
const getCreditRecords = async (req, res) => {
  try {
    const records = await Finance.find({ type: 'credit' })
      .populate('patientId', 'name phone')
      .populate('sessionId', 'date duration')
      .sort({ date: -1 })
      .lean();
    res.json(formatDocs(records));
  } catch (error) {
    console.error('Get credit records error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Mark a credit record as paid
// @route   PUT /api/finance/credits/:id/pay
const markCreditPaid = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid finance record ID.' });
    }

    const { paymentMethod } = req.body;
    const method = paymentMethod || 'cash';

    // Fetch first so we can strip [CREDIT] from description without a nested query
    const existing = await Finance.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Finance record not found.' });

    const cleanDescription = existing.description.replace('[CREDIT] ', '');

    // Update finance record
    const record = await Finance.findByIdAndUpdate(
      req.params.id,
      {
        isPaid:        true,
        paidAt:        new Date(),
        type:          'income',
        paymentMethod: method,
        description:   cleanDescription,
      },
      { new: true }
    ).populate('patientId', 'name');

    // Sync linked session if present
    if (record.sessionId) {
      await Session.findByIdAndUpdate(record.sessionId, {
        paymentStatus: 'paid',
        paymentMethod: method,
      });
    }

    if (record.patientId) {
      await syncPatientPaymentStatus(record.patientId._id || record.patientId);
    }

    res.json({ message: 'Credit marked as paid. Converted to income.', record: formatDoc(record) });
  } catch (error) {
    console.error('Mark credit paid error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Create finance record manually
// @route   POST /api/finance
const createFinanceRecord = async (req, res) => {
  try {
    const { type, amount, paymentMethod, category, description, patientId, date } = req.body;

    if (!type || !amount || !category || !description) {
      return res.status(400).json({ message: 'type, amount, category and description are required.' });
    }

    let pName = '';
    if (patientId && isValidId(patientId)) {
      const p = await require('../models/Patient').findById(patientId);
      if (p) pName = p.name;
    }

    const record = await Finance.create({
      type,
      amount:        parseFloat(amount),
      paymentMethod: type === 'credit' ? null : paymentMethod,
      category,
      description,
      patientId:     patientId && isValidId(patientId) ? patientId : null,
      patientName:   pName,
      isPaid:        type === 'income',
      paidAt:        type === 'income' ? new Date() : null,
      date:          date ? new Date(date) : new Date(),
    });

    await record.populate('patientId', 'name');

    res.status(201).json({ message: 'Finance record created.', record: formatDoc(record) });
  } catch (error) {
    console.error('Create finance error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update finance record
// @route   PUT /api/finance/:id
const updateFinanceRecord = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid finance record ID.' });
    }

    const { type, amount, paymentMethod, category, description, date, isPaid } = req.body;

    const update = {};
    if (type        !== undefined) update.type        = type;
    if (category    !== undefined) update.category    = category;
    if (description !== undefined) update.description = description;
    if (paymentMethod !== undefined) update.paymentMethod = paymentMethod;
    if (amount      !== undefined) update.amount      = parseFloat(amount);
    if (date        !== undefined) update.date        = new Date(date);
    if (isPaid      !== undefined) {
      update.isPaid = isPaid;
      update.paidAt = isPaid ? new Date() : null;
    }

    const record = await Finance.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true,
    });

    if (!record) return res.status(404).json({ message: 'Finance record not found.' });

    res.json({ message: 'Finance record updated.', record: formatDoc(record) });
  } catch (error) {
    console.error('Update finance error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete finance record
// @route   DELETE /api/finance/:id
const deleteFinanceRecord = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid finance record ID.' });
    }

    const record = await Finance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Finance record not found.' });

    // If this finance record is linked to a session, also delete that session
    if (record.sessionId) {
      await Session.findByIdAndDelete(record.sessionId);
    } else if (record.patientId) {
      // If no direct sessionId, delete matching session for this patient on this date
      const dateStart = new Date(record.date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(record.date);
      dateEnd.setHours(23, 59, 59, 999);

      await Session.deleteMany({
        patientId: record.patientId,
        date: { $gte: dateStart, $lte: dateEnd },
      });
    }

    if (record.patientId) {
      await syncPatientPaymentStatus(record.patientId);
    }

    res.json({ message: 'Finance record and associated session deleted successfully.' });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Generate invoice PDF for a patient
// @route   GET /api/finance/invoice/:patientId
const generateInvoice = async (req, res) => {
  try {
    if (!isValidId(req.params.patientId)) {
      return res.status(400).json({ message: 'Invalid patient ID.' });
    }

    const Patient = require('../models/Patient');
    const [patient, finances, sessions] = await Promise.all([
      Patient.findById(req.params.patientId)
        .populate('doctorId', 'name specialization')
        .lean(),
      Finance.find({
        patientId: req.params.patientId,
        type: { $in: ['income', 'credit'] },
      }).sort({ date: -1 }).lean(),
      Session.find({ patientId: req.params.patientId })
        .sort({ date: -1 })
        .limit(20)
        .lean(),
    ]);

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${patient.name.replace(/ /g, '_')}-${Date.now()}.pdf`
    );

    generateInvoicePDF({ ...patient, finances, sessions }, res);
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getAllFinance,
  getFinanceSummary,
  getCreditRecords,
  markCreditPaid,
  createFinanceRecord,
  updateFinanceRecord,
  deleteFinanceRecord,
  generateInvoice,
};
