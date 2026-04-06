const { admin, db, auth } = require('../config/firebase');
const { sendInviteEmail } = require('../utils/email');

const ALLOWED_DOMAINS = ['inspra.ai', 'genius365.ai', 'automateaccelerator.com'];

function validateDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

// GET /api/admin/users
async function listUsers(req, res) {
  try {
    const usersSnap = await db.collection('users').orderBy('createdAt', 'desc').get();
    const users = usersSnap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null,
    }));

    // Also get pending invites
    const invitesSnap = await db.collection('invites')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    const invites = invitesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null,
      expiresAt: doc.data().expiresAt?.toDate?.() || null,
    }));

    res.json({ users, invites });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

// POST /api/admin/invite
async function inviteUser(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateDomain(email)) {
      return res.status(400).json({ error: 'Email domain not allowed' });
    }

    // Check if user already exists
    try {
      await auth.getUserByEmail(email);
      return res.status(409).json({ error: 'User with this email already exists' });
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // Check for existing pending invite
    const existingInvite = await db.collection('invites')
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingInvite.empty) {
      return res.status(409).json({ error: 'An invitation has already been sent to this email' });
    }

    // Create invite
    await db.collection('invites').add({
      email,
      invitedBy: req.user.uid,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Send invite email
    await sendInviteEmail(email, req.user.email);

    res.status(201).json({ message: `Invitation sent to ${email}` });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
}

// DELETE /api/admin/users/:uid
async function deleteUser(req, res) {
  try {
    const { uid } = req.params;

    // Prevent self-deletion
    if (uid === req.user.uid) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete from Firebase Auth
    await auth.deleteUser(uid);

    // Delete from Firestore
    await db.collection('users').doc(uid).delete();

    // Clean up OTPs
    const otps = await db.collection('otps').where('uid', '==', uid).get();
    const batch = db.batch();
    otps.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Still delete Firestore doc if auth user was already gone
      await db.collection('users').doc(req.params.uid).delete();
      return res.json({ message: 'User deleted successfully' });
    }
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

module.exports = { listUsers, inviteUser, deleteUser };
