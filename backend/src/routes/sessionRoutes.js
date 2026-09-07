const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllSessions, getSessionById, createSession, updateSession, deleteSession,
  markSessionPaid, getTherapyTypes, createTherapyType,
} = require('../controllers/sessionController');

router.use(authMiddleware);

router.get('/therapy-types', getTherapyTypes);
router.post('/therapy-types', createTherapyType);
router.get('/', getAllSessions);
router.get('/:id', getSessionById);
router.post('/', createSession);
router.put('/:id', updateSession);
router.put('/:id/mark-paid', markSessionPaid);
router.delete('/:id', deleteSession);

module.exports = router;
