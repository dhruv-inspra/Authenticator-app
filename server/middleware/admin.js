const { db } = require('../config/firebase');

async function requireAdmin(req, res, next) {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
}

module.exports = { requireAdmin };
