// Role-based access control. Use after `protect`.
// Usage: router.post('/', protect, authorize('admin', 'manager'), handler)

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized.' });
    }
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Your role ("${req.user.role}") is not allowed to perform this action.`,
      });
    }
    next();
  };
}

module.exports = { authorize };
