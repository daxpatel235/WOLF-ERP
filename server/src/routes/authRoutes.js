const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { isEmail, isNonEmpty, isStrongPassword } = require('../utils/validators');

const STRONG_PW = [isStrongPassword, 'Password must be at least 8 characters and include an uppercase letter and a number.'];

router.post(
  '/register',
  authLimiter,
  validate({
    name: [[isNonEmpty, 'Name is required.']],
    email: [[isEmail, 'A valid email is required.']],
    password: [STRONG_PW],
  }),
  ctrl.register
);

router.post(
  '/login',
  authLimiter,
  validate({
    email: [[isEmail, 'A valid email is required.']],
    password: [[isNonEmpty, 'Password is required.']],
  }),
  ctrl.login
);

router.get('/me', protect, ctrl.me);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);

router.post(
  '/reset-password',
  authLimiter,
  validate({
    token: [[isNonEmpty, 'Reset token is required.']],
    password: [STRONG_PW],
  }),
  ctrl.resetPassword
);

module.exports = router;
