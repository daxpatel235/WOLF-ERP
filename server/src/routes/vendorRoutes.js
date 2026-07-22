const router = require('express').Router();
const ctrl = require('../controllers/vendorController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const { validate } = require('../middleware/validate');
const { isNonEmpty } = require('../utils/validators');

// Reads are open to every member of the workspace; writes are a delegated
// capability (the owner always holds it).
router.get('/', protect, ctrl.list);
router.get('/:id', protect, ctrl.getOne);

router.post(
  '/',
  protect,
  can('canManageVendors'),
  validate({ name: [[isNonEmpty, 'Vendor name is required.']] }),
  ctrl.create
);

router.put('/:id', protect, can('canManageVendors'), ctrl.update);
router.delete('/:id', protect, can('canManageVendors'), ctrl.remove);

module.exports = router;
