const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');

// Spend figures are commercially sensitive: visible to members the owner has
// granted `canViewReports` (on by default for new members).
router.get('/summary', protect, can('canViewReports'), ctrl.summary);
router.get('/spend-by-category', protect, can('canViewReports'), ctrl.spendByCategory);
router.get('/spend-by-vendor', protect, can('canViewReports'), ctrl.spendByVendor);
router.get('/activity', protect, can('canViewReports'), ctrl.activity);

module.exports = router;
