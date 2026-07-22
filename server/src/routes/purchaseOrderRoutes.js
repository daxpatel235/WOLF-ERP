const router = require('express').Router();
const ctrl = require('../controllers/purchaseOrderController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');

router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getOne);

router.post('/', protect, can('canCreatePO'), ctrl.create);
router.put('/:id', protect, can('canCreatePO'), ctrl.update);
router.post('/:id/submit', protect, can('canCreatePO'), ctrl.submit);
router.post('/:id/status', protect, can('canCreatePO'), ctrl.setStatus);

module.exports = router;
