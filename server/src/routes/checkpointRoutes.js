const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createCheckpoint, getCheckpoints, autosave } = require('../controllers/checkpointController');

const router = express.Router({ mergeParams: true });

router.post('/autosave', autosave); // no protect — sendBeacon can't send auth headers
router.use(protect);
router.post('/', createCheckpoint);
router.get('/', getCheckpoints);

module.exports = router;