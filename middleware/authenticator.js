const jwt = require('jsonwebtoken');
const userModel = require('../schema/userSchema');

const requireAdmin = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.jwt_secret);

    const user = await userModel.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.admin) {
      return res.status(403).json({ error: 'Access denied: admin only' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = requireAdmin;