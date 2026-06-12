const router = require('express').Router();
const ctrl = require('../controllers/vendorController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const { isNonEmpty } = require('../utils/validators');

router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getOne);

router.post(
  '/',
  protect,
  validate({ name: [[isNonEmpty, 'Vendor name is required.']] }),
  ctrl.create
);

router.put('/:id', protect, ctrl.update);
router.delete('/:id', protect, authorize('admin', 'manager'), ctrl.remove);

module.exports = router;
