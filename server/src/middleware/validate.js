const { check } = require('../utils/validators');

// Build an Express middleware from a rules map (see utils/validators.check).
// On failure responds 422 with { message, errors }.
function validate(rules) {
  return (req, res, next) => {
    const errors = check(req.body || {}, rules);
    if (Object.keys(errors).length) {
      return res.status(422).json({ message: 'Please fix the highlighted fields.', errors });
    }
    next();
  };
}

module.exports = { validate };
