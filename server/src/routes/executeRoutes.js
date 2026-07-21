const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { executeCode } = require('../controllers/executeController');

const router = express.Router();
router.use(protect);
router.post('/', executeCode);

module.exports = router;