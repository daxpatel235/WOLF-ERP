const router = require('express').Router();
const ctrl = require('../controllers/approvalController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');

router.get('/', protect, ctrl.list);
router.get('/count', protect, ctrl.count);

// Signing off is the capability the owner delegates to approvers.
router.post('/:id/decide', protect, can('canApprove'), ctrl.decide);

module.exports = router;
