const { admin, db, auth } = require('../config/firebase');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/email');
const { encrypt, decrypt } = require('../utils/encryption');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const ALLOWED_DOMAINS = ['inspra.ai', 'genius365.ai', 'automateaccelerator.com'];

function validateDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    if (!validateDomain(email)) {
      return res.status(400).json({ error: 'Email domain not allowed. Use @inspra.ai, @genius365.ai, or @automateaccelerator.com' });
    }

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    // Create Firestore user doc
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role: 'user',
      totpSecret: null,
      totpEnabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      invitedBy: null,
    });

    // Generate and send OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);

    await db.collection('otps').add({
      uid: userRecord.uid,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
      attempts: 0,
    });

    await sendOtpEmail(email, otp);

    // Create a custom token so frontend can track this user through 2FA
    const customToken = await auth.createCustomToken(userRecord.uid, { pendingMfa: true });

    res.status(201).json({
      message: 'Account created. Check your email for the verification code.',
      uid: userRecord.uid,
      customToken,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
}

// POST /api/auth/send-otp
async function sendOtp(req, res) {
  try {
    const { uid, email } = req.user;

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);

    // Delete any existing OTPs for this user
    const existingOtps = await db.collection('otps').where('uid', '==', uid).get();
    const batch = db.batch();
    existingOtps.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await db.collection('otps').add({
      uid,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
      attempts: 0,
    });

    await sendOtpEmail(email, otp);

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}

// POST /api/auth/verify-otp
async function verifyOtpHandler(req, res) {
  try {
    const { otp } = req.body;
    const { uid } = req.user;

    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
    }

    const otpSnap = await db.collection('otps')
      .where('uid', '==', uid)
      .where('verified', '==', false)
      .limit(1)
      .get();

    if (otpSnap.empty) {
      return res.status(400).json({ error: 'No pending OTP found. Request a new one.' });
    }

    const otpDoc = otpSnap.docs[0];
    const otpData = otpDoc.data();

    // Check expiry
    if (new Date() > otpData.expiresAt.toDate()) {
      await otpDoc.ref.delete();
      return res.status(400).json({ error: 'OTP has expired. Request a new one.' });
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      await otpDoc.ref.delete();
      return res.status(400).json({ error: 'Too many failed attempts. Request a new OTP.' });
    }

    const isValid = await verifyOtp(otp, otpData.otpHash);

    if (!isValid) {
      await otpDoc.ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark as verified
    await otpDoc.ref.update({ verified: true });

    res.json({ message: 'OTP verified successfully', otpVerified: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
}

// POST /api/auth/setup-totp
async function setupTotp(req, res) {
  try {
    const { uid, email } = req.user;

    const secret = speakeasy.generateSecret({
      name: `Inspra AI (${email})`,
      issuer: 'Inspra AI',
    });

    // Store the secret temporarily (encrypted) — will be finalized on verify
    await db.collection('users').doc(uid).update({
      pendingTotpSecret: encrypt(secret.base32),
    });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      qrCode: qrDataUrl,
      manualKey: secret.base32,
    });
  } catch (error) {
    console.error('Setup TOTP error:', error);
    res.status(500).json({ error: 'Failed to setup authenticator' });
  }
}

// POST /api/auth/verify-totp
async function verifyTotpHandler(req, res) {
  try {
    const { token } = req.body;
    const { uid } = req.user;

    if (!token) {
      return res.status(400).json({ error: 'Authenticator code is required' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    // Determine which secret to use: pending (first setup) or existing
    let secretBase32;
    if (userData.pendingTotpSecret) {
      secretBase32 = decrypt(userData.pendingTotpSecret);
    } else if (userData.totpSecret) {
      secretBase32 = decrypt(userData.totpSecret);
    } else {
      return res.status(400).json({ error: 'TOTP not set up. Please set up authenticator first.' });
    }

    const isValid = speakeasy.totp.verify({
      secret: secretBase32,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid authenticator code' });
    }

    // Finalize TOTP setup if this was first time
    if (userData.pendingTotpSecret) {
      await db.collection('users').doc(uid).update({
        totpSecret: userData.pendingTotpSecret,
        totpEnabled: true,
        pendingTotpSecret: admin.firestore.FieldValue.delete(),
      });
    }

    // Issue a custom token with 2FA complete claim
    const customToken = await auth.createCustomToken(uid, { mfaComplete: true });

    res.json({
      message: '2FA verification complete',
      customToken,
      mfaComplete: true,
    });
  } catch (error) {
    console.error('Verify TOTP error:', error);
    res.status(500).json({ error: 'Failed to verify authenticator code' });
  }
}

// POST /api/auth/google-verify
async function googleVerify(req, res) {
  try {
    const { uid, email } = req.user;

    if (!validateDomain(email)) {
      // Delete the Firebase Auth user since domain is not allowed
      await auth.deleteUser(uid);
      return res.status(400).json({ error: 'Email domain not allowed' });
    }

    // Check if user doc exists in Firestore
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      // First time Google sign-in — create user doc
      await db.collection('users').doc(uid).set({
        email,
        displayName: req.user.name || email.split('@')[0],
        role: 'user',
        totpSecret: null,
        totpEnabled: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        invitedBy: null,
      });
    }

    const userData = userDoc.exists ? userDoc.data() : { totpEnabled: false };

    // Send OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);

    // Clear existing OTPs
    const existingOtps = await db.collection('otps').where('uid', '==', uid).get();
    const batch = db.batch();
    existingOtps.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await db.collection('otps').add({
      uid,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
      attempts: 0,
    });

    await sendOtpEmail(email, otp);

    res.json({
      message: 'OTP sent to your email',
      totpEnabled: userData.totpEnabled,
      isNewUser: !userDoc.exists,
    });
  } catch (error) {
    console.error('Google verify error:', error);
    res.status(500).json({ error: 'Failed to verify Google account' });
  }
}

module.exports = {
  signup,
  sendOtp,
  verifyOtpHandler,
  setupTotp,
  verifyTotpHandler,
  googleVerify,
};
