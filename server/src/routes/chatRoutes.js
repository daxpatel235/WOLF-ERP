const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');

// Chat is a delegated capability: the owner always has it, members get it from
// the workspace's default permissions unless the owner revokes it.
router.get('/channels', protect, can('canChat'), ctrl.listChannels);
router.post('/channels', protect, can('canChat'), ctrl.createChannel);

router.get('/channels/:id/messages', protect, can('canChat'), ctrl.listMessages);
router.post('/channels/:id/messages', protect, can('canChat'), ctrl.postMessage);

module.exports = router;
