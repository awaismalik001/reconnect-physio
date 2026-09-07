const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor,
} = require('../controllers/doctorController');

router.use(authMiddleware);

router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.post('/', upload.single('photo'), createDoctor);
router.put('/:id', upload.single('photo'), updateDoctor);
router.delete('/:id', deleteDoctor);

module.exports = router;
