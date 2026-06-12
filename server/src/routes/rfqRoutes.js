const router = require('express').Router();
const ctrl = require('../controllers/rfqController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { isNonEmpty } = require('../utils/validators');

router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getOne);

router.post(
  '/',
  protect,
  validate({ title: [[isNonEmpty, 'RFQ title is required.']] }),
  ctrl.create
);

router.put('/:id', protect, ctrl.update);
router.post('/:id/publish', protect, ctrl.publish);
router.post('/:id/submit', protect, ctrl.submitForApproval);

module.exports = router;
