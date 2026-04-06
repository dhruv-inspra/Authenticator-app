const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(to, otp) {
  await transporter.sendMail({
    from: `"Inspra AI" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your Inspra AI Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f172a; color: #fff; border-radius: 16px;">
        <h1 style="color: #818cf8; margin-bottom: 8px;">Inspra AI</h1>
        <p style="color: #94a3b8;">Your verification code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #fff; background: #1e293b; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
}

async function sendInviteEmail(to, inviterEmail) {
  const signupUrl = `${process.env.FRONTEND_URL}/login?invite=true&email=${encodeURIComponent(to)}`;
  await transporter.sendMail({
    from: `"Inspra AI" <${process.env.SMTP_USER}>`,
    to,
    subject: "You're invited to Inspra AI",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f172a; color: #fff; border-radius: 16px;">
        <h1 style="color: #818cf8; margin-bottom: 8px;">Inspra AI</h1>
        <p style="color: #94a3b8;">${inviterEmail} has invited you to join Inspra AI.</p>
        <a href="${signupUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 32px; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Create Your Account
        </a>
        <p style="color: #64748b; font-size: 14px; margin-top: 16px;">This invitation expires in 7 days.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail, sendInviteEmail };
