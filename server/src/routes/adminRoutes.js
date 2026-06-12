const router = require('express').Router();
const ctrl = require('../controllers/adminController');

// Token-protected (shared secret in x-cleanup-token) — see adminController.
router.post('/cleanup', ctrl.cleanup);
router.get('/cleanup/status', ctrl.status);

module.exports = router;
