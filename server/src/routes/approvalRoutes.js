const router = require('express').Router();
const ctrl = require('../controllers/approvalController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/', protect, ctrl.list);
router.get('/count', protect, ctrl.count);
router.post('/:id/decide', protect, authorize('admin', 'manager', 'approver'), ctrl.decide);

module.exports = router;
