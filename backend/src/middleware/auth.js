const jwt = require('jsonwebtoken');

// RRS-SR-002: token-based session auth. Use as the first middleware on any
// route that needs a logged-in user.
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
    if (
      !decoded ||
      !Number.isSafeInteger(decoded.userId) ||
      decoded.userId <= 0 ||
      !['passenger', 'admin'].includes(decoded.role)
    ) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: decoded.userId, role: decoded.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = auth;
