const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllAppointments, getTodayAppointments,
  createAppointment, updateAppointment, deleteAppointment,
} = require('../controllers/appointmentController');

router.use(authMiddleware);

router.get('/', getAllAppointments);
router.get('/today', getTodayAppointments);
router.post('/', createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

module.exports = router;
