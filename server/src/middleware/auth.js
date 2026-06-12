const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

// Verify the JWT from the Authorization header and attach the user to req.
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized — no token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired or token invalid. Please sign in again.' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'The user for this token no longer exists.' });
    }
    if (user.status && user.status !== 'Active') {
      return res.status(403).json({ message: 'Your account is not active. Contact an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Optional auth: attaches the user if a valid token is present, but never blocks.
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch {
      /* ignore — treat as anonymous */
    }
  }
  next();
}

module.exports = { protect, optionalAuth };
