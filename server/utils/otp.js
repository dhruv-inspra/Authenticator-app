const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function generateOtp() {
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

module.exports = { generateOtp, hashOtp, verifyOtp };
