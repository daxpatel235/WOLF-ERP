const router = require('express').Router();
const ctrl = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getOne);

router.post('/', protect, ctrl.create);
router.post('/:id/status', protect, ctrl.setStatus);
router.post('/:id/pay', protect, ctrl.recordPayment);
router.post('/:id/send', protect, ctrl.send);

module.exports = router;
