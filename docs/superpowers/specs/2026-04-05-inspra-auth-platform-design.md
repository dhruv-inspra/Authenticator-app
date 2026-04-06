# Inspra AI Authentication Platform — Design Spec

**Date:** 2026-04-05  
**Status:** Draft  

## 1. Overview

A secure authentication platform for Inspra AI with domain-restricted access, mandatory two-factor authentication (email OTP + Google Authenticator TOTP), role-based admin user management, and a dashboard. Built with React (Vite) frontend, Express.js backend, and Firebase (Auth + Firestore).

## 2. Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React (Vite)   │────▶│  Express API     │────▶│  Firebase    │
│  SPA Frontend   │◀────│  Backend         │◀────│  (Auth +     │
│  Port 5173      │     │  Port 5000       │     │   Firestore) │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

### Tech Stack

- **Frontend:** React 18 + Vite + React Router v6 + Tailwind CSS
- **Backend:** Express.js + Firebase Admin SDK
- **Database:** Firestore
- **Auth:** Firebase Auth (email/password + Google provider)
- **Email:** Nodemailer (SMTP)
- **TOTP:** speakeasy + qrcode libraries
- **Encryption:** crypto (Node.js built-in) for TOTP secret encryption at rest

## 3. Allowed Email Domains

Only these three domains can sign up or sign in:

- `@inspra.ai`
- `@genius365.ai`
- `@automateaccelerator.com`

Validated on both frontend (UX feedback) and backend (security enforcement).

## 4. Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/login` | Sign In / Sign Up with tabs | Public only (redirects authenticated users to `/dashboard`) |
| `/verify-otp` | Email OTP verification | Mid-auth only (requires pending auth session) |
| `/verify-totp` | Google Authenticator code entry (shows QR on first setup) | Mid-auth only (requires OTP verified) |
| `/dashboard` | Welcome to Inspra AI | Authenticated users (both roles) |
| `/admin` | User management — add/delete users | Admin role only |

## 5. Authentication Flows

### 5.1 Sign Up Flow

1. User clicks "Sign Up" tab on `/login`
2. Enters email + password
3. Frontend validates email domain — rejects non-allowed domains immediately
4. `POST /api/auth/signup` — backend validates domain server-side, creates Firebase Auth user, generates 6-digit OTP, hashes it, stores in Firestore `otps` collection, sends OTP via Nodemailer
5. Redirects to `/verify-otp` — user enters OTP code — `POST /api/auth/verify-otp`
6. On OTP success → redirects to `/verify-totp` — `POST /api/auth/setup-totp` generates TOTP secret via speakeasy, returns QR code data URL
7. User scans QR with Google Authenticator, enters 6-digit code — `POST /api/auth/verify-totp`
8. On TOTP success → secret encrypted and saved to Firestore `users/{uid}`, user marked as fully verified, Firebase custom token issued
9. Frontend receives custom token, signs in with `signInWithCustomToken`, redirects to `/dashboard`

### 5.2 Sign In Flow

1. User enters email + password on "Sign In" tab
2. Frontend calls `signInWithEmailAndPassword` (Firebase client SDK) to validate credentials
3. On success, calls `POST /api/auth/send-otp` with Firebase ID token — backend sends email OTP
4. Redirects to `/verify-otp` — user enters code — `POST /api/auth/verify-otp`
5. On success → redirects to `/verify-totp` — user enters current TOTP code from Google Authenticator (no QR shown — already enrolled)
6. `POST /api/auth/verify-totp` — backend verifies code against stored encrypted secret
7. Both pass → issues custom token with 2FA claims → redirects to `/dashboard`

### 5.3 Google Sign-In Flow

1. User clicks "Sign in with Google" button
2. Firebase `signInWithPopup(GoogleAuthProvider)` triggers Google OAuth
3. On success, `POST /api/auth/google-verify` sends Firebase ID token to backend
4. Backend extracts email from token, validates domain
5. Checks if user has TOTP enrolled in Firestore:
   - **First time:** Full OTP + TOTP setup flow (same as sign-up steps 4-8)
   - **Returning:** OTP + TOTP verification flow (same as sign-in steps 3-7)
6. Custom token issued → `/dashboard`

## 6. Firestore Data Model

### 6.1 `users/{uid}`

```json
{
  "email": "user@inspra.ai",
  "displayName": "User Name",
  "role": "admin" | "user",
  "totpSecret": "encrypted-string",
  "totpEnabled": true | false,
  "createdAt": "Timestamp",
  "invitedBy": "admin-uid" | null
}
```

### 6.2 `invites/{inviteId}`

```json
{
  "email": "newuser@inspra.ai",
  "invitedBy": "admin-uid",
  "status": "pending" | "accepted",
  "createdAt": "Timestamp",
  "expiresAt": "Timestamp (7 days from creation)"
}
```

### 6.3 `otps/{docId}`

```json
{
  "uid": "firebase-uid",
  "otpHash": "bcrypt-hash",
  "expiresAt": "Timestamp (5 minutes from creation)",
  "verified": false,
  "attempts": 0
}
```

## 7. Backend API Endpoints

All authenticated endpoints require `Authorization: Bearer <firebase-id-token>` header.

### 7.1 Auth Endpoints

| Method | Endpoint | Body | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ email, password, displayName }` | Create user, send OTP |
| POST | `/api/auth/send-otp` | `{ }` (uses token) | Send email OTP for sign-in |
| POST | `/api/auth/verify-otp` | `{ otp }` | Verify 6-digit email OTP |
| POST | `/api/auth/setup-totp` | `{ }` | Generate TOTP secret + QR data URL |
| POST | `/api/auth/verify-totp` | `{ token }` | Verify TOTP code, complete 2FA |
| POST | `/api/auth/google-verify` | `{ }` (uses token) | Validate Google user domain, check enrollment |

### 7.2 Admin Endpoints (require `role: "admin"`)

| Method | Endpoint | Body | Purpose |
|---|---|---|---|
| GET | `/api/admin/users` | — | List all users |
| POST | `/api/admin/invite` | `{ email }` | Send invite email, create invite record |
| DELETE | `/api/admin/users/:uid` | — | Delete user from Auth + Firestore |

## 8. Security

- **Domain validation:** Both client-side (immediate feedback) and server-side (enforcement)
- **OTP:** 6-digit, bcrypt-hashed, expires in 5 minutes, max 3 attempts, single-use
- **TOTP secrets:** AES-256-GCM encrypted before storing in Firestore, encryption key in environment variable
- **Auth middleware:** Every protected endpoint verifies Firebase ID token via Admin SDK
- **Admin middleware:** Checks Firestore `users/{uid}.role === "admin"`
- **Rate limiting:** express-rate-limit on auth endpoints (5 requests/minute for OTP)
- **CORS:** Restricted to frontend origin only
- **Helmet:** HTTP security headers via helmet middleware

## 9. Admin Page Features

- **User Table:** Displays all users — columns: Email, Name, Role, Status, Created Date, Actions
- **Add User Button:** Opens modal with email input → validates domain → calls invite endpoint → sends email with sign-up link containing invite token
- **Delete User:** Per-row delete button → confirmation modal ("Are you sure?") → calls delete endpoint → removes from Firebase Auth + Firestore
- **Invite Status:** Shows pending invites in a separate section

## 10. UI Design

### Theme
- **Background:** Dark slate/navy (`#0f172a` to `#1e293b` gradient)
- **Cards:** Semi-transparent dark cards with subtle border (`rgba(255,255,255,0.1)`)
- **Accent:** Blue-purple gradient (`#3b82f6` to `#8b5cf6`)
- **Text:** White primary, slate-400 secondary
- **Inputs:** Dark background with light borders, focus ring in accent color

### Login Page
- Full-screen centered card (max-w-md)
- "Inspra AI" branding at top with gradient text
- Tabs: "Sign In" | "Sign Up" 
- Form fields: Email, Password (+ Display Name for sign-up)
- "Sign in with Google" button with Google icon below the form
- Subtle domain hint text below email field

### OTP Verification Page
- Centered card with large 6-digit input (separate boxes per digit)
- "Check your email" message with email address shown
- Countdown timer showing OTP expiry
- "Resend OTP" link (disabled during cooldown)

### TOTP Setup/Verify Page
- Centered card
- First time: QR code prominently displayed + instruction text + 6-digit input
- Returning: Just 6-digit input with "Enter code from Google Authenticator"

### Dashboard
- Left sidebar (collapsible): Navigation items — Dashboard, Admin (admin only)
- Main content: "Welcome to Inspra AI" heading with user greeting
- Top bar: User avatar/email + logout button

### Admin Page
- Same sidebar layout
- Content: "User Management" heading
- "Invite User" button (top right) → modal
- Users table with search/filter
- Pending invites section below

## 11. Project Structure

```
authenticator-app/
├── client/                    # React Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Sidebar + topbar layout
│   │   │   ├── ProtectedRoute.jsx  # Auth route guard
│   │   │   └── AdminRoute.jsx      # Admin role guard
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── VerifyOtpPage.jsx
│   │   │   ├── VerifyTotpPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx     # Firebase auth state + 2FA status
│   │   ├── services/
│   │   │   ├── firebase.js         # Firebase client config
│   │   │   └── api.js              # Axios instance for backend calls
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css               # Tailwind imports
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
├── server/                    # Express backend
│   ├── config/
│   │   └── firebase.js             # Firebase Admin SDK init
│   ├── middleware/
│   │   ├── auth.js                 # Verify Firebase ID token
│   │   ├── admin.js                # Check admin role
│   │   └── rateLimit.js            # Rate limiting config
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── adminRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── adminController.js
│   ├── utils/
│   │   ├── email.js                # Nodemailer config + send functions
│   │   ├── otp.js                  # OTP generation + hashing
│   │   └── encryption.js           # AES-256-GCM for TOTP secrets
│   ├── server.js                   # Express app entry point
│   ├── package.json
│   └── .env
├── scripts/
│   └── seed-admin.js              # One-time script to create first admin
├── docs/
│   └── superpowers/specs/
│       └── 2026-04-05-inspra-auth-platform-design.md
└── .gitignore
```

## 12. Environment Variables

### Server `.env`
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
TOTP_ENCRYPTION_KEY=          # 32-byte hex string for AES-256
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
FRONTEND_URL=http://localhost:5173
PORT=5000
```

### Client `.env`
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=http://localhost:5000/api
```

## 13. Seed Admin Script

`scripts/seed-admin.js` — run once to bootstrap the first admin:
- Takes email as CLI argument
- Creates or updates the user's Firestore document with `role: "admin"`
- Sets Firebase custom claims `{ admin: true }`
