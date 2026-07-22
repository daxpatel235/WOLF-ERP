const router = require('express').Router();
const ctrl = require('../controllers/rfqController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const { validate } = require('../middleware/validate');
const { isNonEmpty } = require('../utils/validators');

router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getOne);

router.post(
  '/',
  protect,
  can('canCreateRFQ'),
  validate({ title: [[isNonEmpty, 'RFQ title is required.']] }),
  ctrl.create
);

router.put('/:id', protect, can('canCreateRFQ'), ctrl.update);
router.post('/:id/publish', protect, can('canCreateRFQ'), ctrl.publish);
router.post('/:id/submit', protect, can('canCreateRFQ'), ctrl.submitForApproval);

module.exports = router;
