const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { isEmail, isNonEmpty } = require('../utils/validators');

router.post(
  '/register',
  validate({
    name: [[isNonEmpty, 'Name is required.']],
    email: [[isEmail, 'A valid email is required.']],
    password: [[(v) => isNonEmpty(v) && String(v).length >= 6, 'Password must be at least 6 characters.']],
  }),
  ctrl.register
);

router.post(
  '/login',
  validate({
    email: [[isEmail, 'A valid email is required.']],
    password: [[isNonEmpty, 'Password is required.']],
  }),
  ctrl.login
);

router.get('/me', protect, ctrl.me);
router.post('/forgot-password', ctrl.forgotPassword);

module.exports = router;
