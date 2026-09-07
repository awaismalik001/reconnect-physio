const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getAllPatients, getPatientById, createPatient,
  updatePatient, deletePatient, uploadDocument, deleteDocument,
} = require('../controllers/patientController');

router.use(authMiddleware);

router.get('/', getAllPatients);
router.get('/:id', getPatientById);
router.post('/', upload.single('photo'), createPatient);
router.put('/:id', upload.single('photo'), updatePatient);
router.delete('/:id', deletePatient);
router.post('/:id/documents', upload.single('document'), uploadDocument);
router.delete('/documents/:docId', deleteDocument);

module.exports = router;
