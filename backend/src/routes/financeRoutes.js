const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllFinance, getFinanceSummary, getCreditRecords, markCreditPaid,
  createFinanceRecord, updateFinanceRecord, deleteFinanceRecord, generateInvoice,
} = require('../controllers/financeController');

router.use(authMiddleware);

router.get('/summary', getFinanceSummary);
router.get('/invoice/:patientId', generateInvoice);
router.get('/credits', getCreditRecords);
router.put('/credits/:id/pay', markCreditPaid);
router.get('/', getAllFinance);
router.post('/', createFinanceRecord);
router.put('/:id', updateFinanceRecord);
router.delete('/:id', deleteFinanceRecord);

module.exports = router;
