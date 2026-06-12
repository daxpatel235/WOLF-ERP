const router = require('express').Router();
const ctrl = require('../controllers/purchaseOrderController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getOne);

router.post('/', protect, ctrl.create);
router.put('/:id', protect, ctrl.update);
router.post('/:id/submit', protect, ctrl.submit);
router.post('/:id/status', protect, ctrl.setStatus);

module.exports = router;
