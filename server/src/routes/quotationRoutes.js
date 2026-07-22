const router = require('express').Router();
const ctrl = require('../controllers/quotationController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');

router.get('/', protect, ctrl.list);
router.get('/compare', protect, ctrl.compare); // must precede '/:id'
router.get('/:id', protect, ctrl.getOne);

// Recording and triaging vendor quotes belongs to whoever runs sourcing.
router.post('/', protect, can('canCreateRFQ'), ctrl.create);
router.post('/:id/shortlist', protect, can('canCreateRFQ'), ctrl.shortlist);
router.post('/:id/status', protect, can('canCreateRFQ'), ctrl.setStatus);

// Awarding drafts a purchase order, so it needs the PO capability.
router.post('/:id/award', protect, can('canCreatePO'), ctrl.award);

module.exports = router;
