const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const {
  signup,
  sendOtp,
  verifyOtpHandler,
  setupTotp,
  verifyTotpHandler,
  googleVerify,
} = require('../controllers/authController');

router.post('/signup', authLimiter, signup);
router.post('/send-otp', authLimiter, verifyToken, sendOtp);
router.post('/verify-otp', authLimiter, verifyToken, verifyOtpHandler);
router.post('/setup-totp', verifyToken, setupTotp);
router.post('/verify-totp', authLimiter, verifyToken, verifyTotpHandler);
router.post('/google-verify', verifyToken, googleVerify);

module.exports = router;
