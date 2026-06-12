const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, ctrl.summary);
router.get('/spend-by-category', protect, ctrl.spendByCategory);
router.get('/spend-by-vendor', protect, ctrl.spendByVendor);
router.get('/activity', protect, ctrl.activity);

module.exports = router;
