const router = require('express').Router();
const ctrl = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');

router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getOne);

// Invoicing moves money, so it is off by default for new members: the owner
// grants `canSendInvoices` to the people who should raise, settle and send them.
router.post('/', protect, can('canSendInvoices'), ctrl.create);
router.post('/:id/status', protect, can('canSendInvoices'), ctrl.setStatus);
router.post('/:id/pay', protect, can('canSendInvoices'), ctrl.recordPayment);
router.post('/:id/send', protect, can('canSendInvoices'), ctrl.send);

module.exports = router;
