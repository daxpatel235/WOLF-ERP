const router = require('express').Router();
const ctrl = require('../controllers/teamController');
const { protect } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { isEmail, isNonEmpty, isStrongPassword } = require('../utils/validators');

const STRONG_PW = [isStrongPassword, 'Password must be at least 8 characters and include an uppercase letter and a number.'];

// ---- Public: an invitee has no account yet ----
router.get('/invite/:token', ctrl.previewInvite);
router.post(
  '/accept',
  authLimiter,
  validate({
    token: [[isNonEmpty, 'Invitation token is required.']],
    name: [[isNonEmpty, 'Name is required.']],
    password: [STRONG_PW],
  }),
  ctrl.acceptInvite
);

// ---- Authenticated: the workspace's own team ----
// The directory itself is readable by members (subject to the org's
// directoryVisibleToMembers setting, enforced in the controller).
router.get('/members', protect, ctrl.members);

router.post(
  '/invite',
  protect,
  can('canInviteMembers'),
  validate({ email: [[isEmail, 'A valid email is required.']] }),
  ctrl.invite
);
router.get('/invites', protect, can('canInviteMembers'), ctrl.listInvites);
router.delete('/invites/:id', protect, can('canManageMembers'), ctrl.revokeInvite);

router.patch('/members/:id', protect, can('canManageMembers'), ctrl.updateMember);
router.delete('/members/:id', protect, can('canManageMembers'), ctrl.removeMember);

module.exports = router;
