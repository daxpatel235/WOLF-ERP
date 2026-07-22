const router = require('express').Router();
const ctrl = require('../controllers/organizationController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');

// Any member can read their workspace profile (it drives the org UI).
router.get('/', protect, ctrl.get);

// Changing the workspace is a delegated right; the owner always holds it.
router.patch('/', protect, can('canManageOrgSettings'), ctrl.update);

module.exports = router;
