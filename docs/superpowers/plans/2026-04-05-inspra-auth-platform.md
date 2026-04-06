# Inspra AI Auth Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure authentication platform with domain-restricted 2FA (email OTP + Google Authenticator), admin user management, and a dashboard for Inspra AI.

**Architecture:** React (Vite) SPA frontend communicates with Express.js backend. Firebase Auth handles identity (email/password + Google), Express handles custom 2FA flows (OTP via Nodemailer, TOTP via speakeasy). Firestore stores user profiles, invites, and OTP records. Role-based access via Firestore `role` field.

**Tech Stack:** React 18, Vite, Tailwind CSS, React Router v6, Express.js, Firebase Admin SDK, Firebase Client SDK, Nodemailer, speakeasy, qrcode, bcryptjs, helmet, cors, express-rate-limit

---

## File Map

### Server (`server/`)
| File | Responsibility |
|---|---|
| `server/package.json` | Dependencies and scripts |
| `server/.env.example` | Environment variable template |
| `server/server.js` | Express app setup, middleware, route mounting |
| `server/config/firebase.js` | Firebase Admin SDK initialization |
| `server/utils/encryption.js` | AES-256-GCM encrypt/decrypt for TOTP secrets |
| `server/utils/otp.js` | OTP generation + bcrypt hashing |
| `server/utils/email.js` | Nodemailer transporter + send functions |
| `server/middleware/auth.js` | Verify Firebase ID token |
| `server/middleware/admin.js` | Check admin role in Firestore |
| `server/middleware/rateLimit.js` | Rate limiting config |
| `server/routes/authRoutes.js` | Auth endpoint routing |
| `server/routes/adminRoutes.js` | Admin endpoint routing |
| `server/controllers/authController.js` | Signup, OTP, TOTP, Google verify logic |
| `server/controllers/adminController.js` | List users, invite, delete |
| `scripts/seed-admin.js` | One-time admin bootstrap script |

### Client (`client/`)
| File | Responsibility |
|---|---|
| `client/package.json` | Dependencies and scripts |
| `client/index.html` | HTML entry point |
| `client/vite.config.js` | Vite configuration with proxy |
| `client/tailwind.config.js` | Tailwind theme customization |
| `client/postcss.config.js` | PostCSS plugins |
| `client/.env.example` | Environment variable template |
| `client/src/main.jsx` | React entry point |
| `client/src/index.css` | Tailwind imports + global styles |
| `client/src/App.jsx` | Router setup with all routes |
| `client/src/services/firebase.js` | Firebase client SDK init |
| `client/src/services/api.js` | Axios instance with auth interceptor |
| `client/src/contexts/AuthContext.jsx` | Auth state, 2FA status, role management |
| `client/src/components/Layout.jsx` | Sidebar + topbar shell |
| `client/src/components/ProtectedRoute.jsx` | Auth route guard |
| `client/src/components/AdminRoute.jsx` | Admin role guard |
| `client/src/pages/LoginPage.jsx` | Sign in / Sign up with tabs + Google |
| `client/src/pages/VerifyOtpPage.jsx` | Email OTP verification |
| `client/src/pages/VerifyTotpPage.jsx` | TOTP QR setup / code entry |
| `client/src/pages/DashboardPage.jsx` | Welcome page |
| `client/src/pages/AdminPage.jsx` | User management + invites |

### Root
| File | Responsibility |
|---|---|
| `.gitignore` | Ignore node_modules, .env, dist |

---

## Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `.gitignore`
- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `client/package.json`
- Create: `client/.env.example`
- Create: `client/index.html`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/src/main.jsx`
- Create: `client/src/index.css`

- [ ] **Step 1: Create root .gitignore**

```gitignore
node_modules/
dist/
.env
.env.local
*.log
```

- [ ] **Step 2: Create server/package.json and install dependencies**

```json
{
  "name": "inspra-auth-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "helmet": "^8.0.0",
    "express-rate-limit": "^7.4.0",
    "firebase-admin": "^12.6.0",
    "nodemailer": "^6.9.0",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.4",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

Run: `cd server && npm install`

- [ ] **Step 3: Create server/.env.example**

```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
TOTP_ENCRYPTION_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FRONTEND_URL=http://localhost:5173
PORT=5000
```

- [ ] **Step 4: Create client/package.json and install dependencies**

```json
{
  "name": "inspra-auth-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.28.0",
    "firebase": "^11.0.0",
    "axios": "^1.7.0",
    "react-icons": "^5.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

Run: `cd client && npm install`

- [ ] **Step 5: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inspra AI</title>
  </head>
  <body class="bg-slate-900 text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create client/vite.config.js**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 7: Create client/tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 8: Create client/postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 9: Create client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
}

@layer components {
  .btn-primary {
    @apply bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .btn-danger {
    @apply bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .btn-ghost {
    @apply text-slate-300 font-medium py-2 px-4 rounded-lg hover:bg-white/10 transition-all duration-200;
  }

  .input-field {
    @apply w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200;
  }

  .card {
    @apply bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl;
  }
}
```

- [ ] **Step 10: Create client/src/main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 11: Create client/.env.example**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=http://localhost:5000/api
```

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "feat: scaffold project with server and client dependencies"
```

---

## Task 2: Server Foundation — Firebase Config, Utilities, Middleware

**Files:**
- Create: `server/config/firebase.js`
- Create: `server/utils/encryption.js`
- Create: `server/utils/otp.js`
- Create: `server/utils/email.js`
- Create: `server/middleware/auth.js`
- Create: `server/middleware/admin.js`
- Create: `server/middleware/rateLimit.js`
- Create: `server/server.js`

- [ ] **Step 1: Create server/config/firebase.js**

```js
const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
```

- [ ] **Step 2: Create server/utils/encryption.js**

```js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.TOTP_ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
```

- [ ] **Step 3: Create server/utils/otp.js**

```js
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
```

- [ ] **Step 4: Create server/utils/email.js**

```js
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
```

- [ ] **Step 5: Create server/middleware/auth.js**

```js
const { auth, db } = require('../config/firebase');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { verifyToken };
```

- [ ] **Step 6: Create server/middleware/admin.js**

```js
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
```

- [ ] **Step 7: Create server/middleware/rateLimit.js**

```js
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many requests. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };
```

- [ ] **Step 8: Create server/server.js**

```js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { generalLimiter } = require('./middleware/rateLimit');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 9: Commit**

```bash
git add server/
git commit -m "feat: add server foundation — Firebase config, utils, middleware, entry point"
```

---

## Task 3: Auth Controllers & Routes

**Files:**
- Create: `server/controllers/authController.js`
- Create: `server/routes/authRoutes.js`

- [ ] **Step 1: Create server/controllers/authController.js**

```js
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
```

- [ ] **Step 2: Create server/routes/authRoutes.js**

```js
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
```

- [ ] **Step 3: Commit**

```bash
git add server/controllers/authController.js server/routes/authRoutes.js
git commit -m "feat: add auth controller with signup, OTP, TOTP, and Google verify flows"
```

---

## Task 4: Admin Controllers & Routes

**Files:**
- Create: `server/controllers/adminController.js`
- Create: `server/routes/adminRoutes.js`

- [ ] **Step 1: Create server/controllers/adminController.js**

```js
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
```

- [ ] **Step 2: Create server/routes/adminRoutes.js**

```js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { listUsers, inviteUser, deleteUser } = require('../controllers/adminController');

router.use(verifyToken);
router.use(requireAdmin);

router.get('/users', listUsers);
router.post('/invite', inviteUser);
router.delete('/users/:uid', deleteUser);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add server/controllers/adminController.js server/routes/adminRoutes.js
git commit -m "feat: add admin controller with list users, invite, and delete endpoints"
```

---

## Task 5: Seed Admin Script

**Files:**
- Create: `scripts/seed-admin.js`

- [ ] **Step 1: Create scripts/seed-admin.js**

```js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
const { auth, db } = require('../server/config/firebase');

async function seedAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node scripts/seed-admin.js <email>');
    process.exit(1);
  }

  try {
    // Get or create the user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`Found existing user: ${userRecord.uid}`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.error(`No Firebase Auth user found with email ${email}.`);
        console.error('Please sign up first, then run this script.');
        process.exit(1);
      }
      throw err;
    }

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });

    // Update Firestore
    await db.collection('users').doc(userRecord.uid).set(
      { role: 'admin' },
      { merge: true }
    );

    console.log(`Successfully set ${email} as admin.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-admin.js
git commit -m "feat: add seed-admin script to bootstrap first admin user"
```

---

## Task 6: Firebase Client Config & API Service

**Files:**
- Create: `client/src/services/firebase.js`
- Create: `client/src/services/api.js`

- [ ] **Step 1: Create client/src/services/firebase.js**

```jsx
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
  firebaseAuth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
};
```

- [ ] **Step 2: Create client/src/services/api.js**

```jsx
import axios from 'axios';
import { firebaseAuth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(async (config) => {
  const user = firebaseAuth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
```

- [ ] **Step 3: Commit**

```bash
git add client/src/services/
git commit -m "feat: add Firebase client config and API service with auth interceptor"
```

---

## Task 7: Auth Context

**Files:**
- Create: `client/src/contexts/AuthContext.jsx`

- [ ] **Step 1: Create client/src/contexts/AuthContext.jsx**

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  firebaseAuth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword as firebaseSignIn,
  signInWithCustomToken,
  signOut,
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import api from '../services/api';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState({
    otpVerified: false,
    totpVerified: false,
    mfaComplete: false,
  });
  const [userRole, setUserRole] = useState(null);
  const [authStep, setAuthStep] = useState('idle'); // idle | otp | totp | complete
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Check if MFA is complete by checking custom claims
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (tokenResult.claims.mfaComplete) {
          setMfaStatus({ otpVerified: true, totpVerified: true, mfaComplete: true });
          setAuthStep('complete');
          // Fetch user role
          try {
            const res = await api.get('/admin/users');
            // If this succeeds, user is admin
            setUserRole('admin');
          } catch {
            setUserRole('user');
          }
        }
      } else {
        setUser(null);
        setMfaStatus({ otpVerified: false, totpVerified: false, mfaComplete: false });
        setUserRole(null);
        setAuthStep('idle');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signup(email, password, displayName) {
    const res = await api.post('/auth/signup', { email, password, displayName });
    // Sign in with custom token to track user through 2FA
    await signInWithCustomToken(firebaseAuth, res.data.customToken);
    setIsNewUser(true);
    setAuthStep('otp');
    return res.data;
  }

  async function signin(email, password) {
    const credential = await firebaseSignIn(firebaseAuth, email, password);
    await api.post('/auth/send-otp');
    setIsNewUser(false);
    setAuthStep('otp');
    return credential;
  }

  async function signInWithGoogle() {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const res = await api.post('/auth/google-verify');
    setIsNewUser(res.data.isNewUser);
    setAuthStep('otp');
    return res.data;
  }

  async function verifyOtp(otp) {
    const res = await api.post('/auth/verify-otp', { otp });
    setMfaStatus((prev) => ({ ...prev, otpVerified: true }));
    setAuthStep('totp');
    return res.data;
  }

  async function setupTotp() {
    const res = await api.post('/auth/setup-totp');
    return res.data; // { qrCode, manualKey }
  }

  async function verifyTotp(token) {
    const res = await api.post('/auth/verify-totp', { token });
    // Sign in with the new custom token that has mfaComplete claim
    await signInWithCustomToken(firebaseAuth, res.data.customToken);
    setMfaStatus({ otpVerified: true, totpVerified: true, mfaComplete: true });
    setAuthStep('complete');
    // Re-check role
    try {
      await api.get('/admin/users');
      setUserRole('admin');
    } catch {
      setUserRole('user');
    }
    return res.data;
  }

  async function logout() {
    await signOut(firebaseAuth);
    setUser(null);
    setMfaStatus({ otpVerified: false, totpVerified: false, mfaComplete: false });
    setUserRole(null);
    setAuthStep('idle');
    setIsNewUser(false);
  }

  const value = {
    user,
    loading,
    mfaStatus,
    userRole,
    authStep,
    isNewUser,
    signup,
    signin,
    signInWithGoogle,
    verifyOtp,
    setupTotp,
    verifyTotp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/contexts/AuthContext.jsx
git commit -m "feat: add AuthContext with full 2FA flow state management"
```

---

## Task 8: Route Guards & Layout Component

**Files:**
- Create: `client/src/components/ProtectedRoute.jsx`
- Create: `client/src/components/AdminRoute.jsx`
- Create: `client/src/components/Layout.jsx`

- [ ] **Step 1: Create client/src/components/ProtectedRoute.jsx**

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, mfaStatus, authStep } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (authStep === 'otp') {
    return <Navigate to="/verify-otp" replace />;
  }

  if (authStep === 'totp') {
    return <Navigate to="/verify-totp" replace />;
  }

  if (!mfaStatus.mfaComplete) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

- [ ] **Step 2: Create client/src/components/AdminRoute.jsx**

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }) {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
```

- [ ] **Step 3: Create client/src/components/Layout.jsx**

```jsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

export default function Layout({ children }) {
  const { user, userRole, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
    ...(userRole === 'admin'
      ? [{ path: '/admin', label: 'Admin', icon: HiOutlineUsers }]
      : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-800/80 backdrop-blur-sm border-r border-white/10 flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Inspra AI
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <HiOutlineX size={20} /> : <HiOutlineMenu size={20} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.displayName || user?.email}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors w-full px-1"
          >
            <HiOutlineLogout size={18} />
            {sidebarOpen && <span className="text-sm">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/
git commit -m "feat: add ProtectedRoute, AdminRoute guards and Layout with sidebar"
```

---

## Task 9: Login Page

**Files:**
- Create: `client/src/pages/LoginPage.jsx`

- [ ] **Step 1: Create client/src/pages/LoginPage.jsx**

```jsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';

const ALLOWED_DOMAINS = ['inspra.ai', 'genius365.ai', 'automateaccelerator.com'];

function validateDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('invite') ? 'signup' : 'signin';
  const initialEmail = searchParams.get('email') || '';

  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup, signin, signInWithGoogle } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!validateDomain(email)) {
      setError('Only @inspra.ai, @genius365.ai, and @automateaccelerator.com emails are allowed.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signup') {
        if (!displayName.trim()) {
          setError('Display name is required.');
          setLoading(false);
          return;
        }
        await signup(email, password, displayName);
      } else {
        await signin(email, password);
      }
      navigate('/verify-otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/verify-otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Inspra AI
          </h1>
          <p className="text-slate-400 mt-2">Secure authentication platform</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-700/50 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              tab === 'signin'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              tab === 'signup'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Name</label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="input-field pl-10"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@inspra.ai"
                className="input-field pl-10"
                required
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Allowed: @inspra.ai, @genius365.ai, @automateaccelerator.com
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                {tab === 'signup' ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              tab === 'signup' ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-slate-500 text-sm">or</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg py-2.5 text-white font-medium hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
        >
          <FcGoogle size={20} />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/LoginPage.jsx
git commit -m "feat: add LoginPage with sign-in/sign-up tabs, domain validation, and Google sign-in"
```

---

## Task 10: OTP & TOTP Verification Pages

**Files:**
- Create: `client/src/pages/VerifyOtpPage.jsx`
- Create: `client/src/pages/VerifyTotpPage.jsx`

- [ ] **Step 1: Create client/src/pages/VerifyOtpPage.jsx**

```jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineMail } from 'react-icons/hi';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { user, verifyOtp, authStep } = useAuth();

  useEffect(() => {
    if (authStep !== 'otp') {
      navigate(authStep === 'totp' ? '/verify-totp' : '/login');
    }
  }, [authStep, navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(code);
      navigate('/verify-totp');
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
          <HiOutlineMail size={32} className="text-blue-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 mb-1">
          We sent a 6-digit code to
        </p>
        <p className="text-white font-medium mb-6">{user?.email}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            ))}
          </div>

          {countdown > 0 ? (
            <p className="text-slate-500 text-sm mb-6">
              Code expires in{' '}
              <span className="text-blue-400 font-mono">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </p>
          ) : (
            <p className="text-red-400 text-sm mb-6">Code expired. Please request a new one.</p>
          )}

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="btn-primary w-full mb-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Verifying...
              </span>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        <button
          onClick={() => {
            setResendCooldown(30);
            setCountdown(300);
            // Resend OTP handled by re-calling send-otp
          }}
          disabled={resendCooldown > 0}
          className="text-blue-400 text-sm hover:text-blue-300 transition-colors disabled:text-slate-600"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create client/src/pages/VerifyTotpPage.jsx**

```jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineShieldCheck } from 'react-icons/hi';

export default function VerifyTotpPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [manualKey, setManualKey] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { authStep, isNewUser, setupTotp, verifyTotp } = useAuth();

  useEffect(() => {
    if (authStep !== 'totp') {
      navigate(authStep === 'otp' ? '/verify-otp' : '/login');
    }
  }, [authStep, navigate]);

  useEffect(() => {
    if (isNewUser) {
      loadQrCode();
    } else {
      inputRefs.current[0]?.focus();
    }
  }, [isNewUser]);

  async function loadQrCode() {
    setSetupLoading(true);
    try {
      const data = await setupTotp();
      setQrData(data.qrCode);
      setManualKey(data.manualKey);
    } catch (err) {
      setError(err.message);
    } finally {
      setSetupLoading(false);
    }
  }

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const token = code.join('');
    if (token.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyTotp(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
          <HiOutlineShieldCheck size={32} className="text-purple-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isNewUser ? 'Set Up Authenticator' : 'Authenticator Verification'}
        </h2>
        <p className="text-slate-400 mb-6">
          {isNewUser
            ? 'Scan the QR code with Google Authenticator, then enter the 6-digit code.'
            : 'Enter the 6-digit code from your Google Authenticator app.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* QR Code for new users */}
        {isNewUser && (
          <div className="mb-6">
            {setupLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : qrData ? (
              <>
                <div className="bg-white rounded-xl p-4 inline-block mb-4">
                  <img src={qrData} alt="QR Code" className="w-48 h-48" />
                </div>
                <details className="text-left">
                  <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                    Can't scan? Enter key manually
                  </summary>
                  <div className="mt-2 p-3 bg-slate-700/50 rounded-lg">
                    <code className="text-xs text-blue-400 break-all">{manualKey}</code>
                  </div>
                </details>
              </>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.join('').length !== 6}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Verifying...
              </span>
            ) : (
              'Verify & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/VerifyOtpPage.jsx client/src/pages/VerifyTotpPage.jsx
git commit -m "feat: add OTP and TOTP verification pages with digit inputs and QR setup"
```

---

## Task 11: Dashboard Page

**Files:**
- Create: `client/src/pages/DashboardPage.jsx`

- [ ] **Step 1: Create client/src/pages/DashboardPage.jsx**

```jsx
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineShieldCheck, HiOutlineMail } from 'react-icons/hi';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Inspra AI
          </span>
        </h1>
        <p className="text-slate-400">
          Hello, {user?.displayName || user?.email}! Your account is secured with two-factor authentication.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <HiOutlineShieldCheck size={24} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">2FA Enabled</h3>
              <p className="text-slate-400 text-sm">Google Authenticator active</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <HiOutlineMail size={24} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Email Verified</h3>
              <p className="text-slate-400 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/DashboardPage.jsx
git commit -m "feat: add Dashboard page with welcome message and status cards"
```

---

## Task 12: Admin Page

**Files:**
- Create: `client/src/pages/AdminPage.jsx`

- [ ] **Step 1: Create client/src/pages/AdminPage.jsx**

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';

const ALLOWED_DOMAINS = ['inspra.ai', 'genius365.ai', 'automateaccelerator.com'];

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
      setInvites(res.data.invites);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    const domain = inviteEmail.split('@')[1]?.toLowerCase();
    if (!ALLOWED_DOMAINS.includes(domain)) {
      setInviteError('Only @inspra.ai, @genius365.ai, and @automateaccelerator.com emails are allowed.');
      return;
    }

    setInviteLoading(true);
    try {
      const res = await api.post('/admin/invite', { email: inviteEmail });
      setInviteSuccess(res.data.message);
      setInviteEmail('');
      fetchUsers();
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess('');
      }, 2000);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleDelete(uid) {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${uid}`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 mt-1">{users.length} users registered</p>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="btn-primary flex items-center gap-2">
          <HiOutlineUserAdd size={18} />
          Invite User
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="input-field pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Role</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">2FA</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Joined</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.uid} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                      {u.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{u.displayName || 'No name'}</p>
                      <p className="text-slate-400 text-sm">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.totpEnabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {u.totpEnabled ? 'Active' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-right">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => setDeleteConfirm(u)}
                      className="text-slate-400 hover:text-red-400 transition-colors p-1"
                    >
                      <HiOutlineTrash size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-slate-400">No users found.</div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Pending Invitations</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Sent</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/5">
                    <td className="px-6 py-4 text-white">{inv.email}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Invite User</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError('');
                  setInviteSuccess('');
                  setInviteEmail('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@inspra.ai"
                className="input-field mb-2"
                required
              />
              <p className="text-xs text-slate-500 mb-4">
                Allowed: @inspra.ai, @genius365.ai, @automateaccelerator.com
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                    setInviteSuccess('');
                    setInviteEmail('');
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={inviteLoading} className="btn-primary flex-1">
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2">Delete User</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{deleteConfirm.email}</span>? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.uid)}
                disabled={deleteLoading}
                className="btn-danger flex-1"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/AdminPage.jsx
git commit -m "feat: add Admin page with user table, invite modal, and delete confirmation"
```

---

## Task 13: App Router & Final Wiring

**Files:**
- Create: `client/src/App.jsx`

- [ ] **Step 1: Create client/src/App.jsx**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import VerifyTotpPage from './pages/VerifyTotpPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';

function PublicRoute({ children }) {
  const { user, mfaStatus, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (user && mfaStatus.mfaComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/verify-totp" element={<VerifyTotpPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminPage />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd client && npm run build`
Expected: Build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: add App router with all routes, guards, and layout wiring"
```

---

## Task 14: Final Integration Commit

- [ ] **Step 1: Verify all files exist**

Run from project root:
```bash
ls server/config/firebase.js server/utils/encryption.js server/utils/otp.js server/utils/email.js server/middleware/auth.js server/middleware/admin.js server/middleware/rateLimit.js server/server.js server/controllers/authController.js server/controllers/adminController.js server/routes/authRoutes.js server/routes/adminRoutes.js scripts/seed-admin.js client/src/services/firebase.js client/src/services/api.js client/src/contexts/AuthContext.jsx client/src/components/Layout.jsx client/src/components/ProtectedRoute.jsx client/src/components/AdminRoute.jsx client/src/pages/LoginPage.jsx client/src/pages/VerifyOtpPage.jsx client/src/pages/VerifyTotpPage.jsx client/src/pages/DashboardPage.jsx client/src/pages/AdminPage.jsx client/src/App.jsx
```

Expected: All files listed without errors.

- [ ] **Step 2: Run server in development mode**

Run: `cd server && npm run dev`
Expected: "Server running on port 5000" (will fail without .env — that's expected)

- [ ] **Step 3: Run client dev server**

Run: `cd client && npm run dev`
Expected: Vite dev server starts on port 5173.

- [ ] **Step 4: Final commit with any remaining files**

```bash
git add -A
git commit -m "feat: complete Inspra AI auth platform — all pages, auth flows, and admin features"
```
