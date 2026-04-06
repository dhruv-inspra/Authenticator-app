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
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Check if MFA is complete by checking custom claims
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (tokenResult.claims.mfaComplete) {
          setMfaStatus({ otpVerified: true, totpVerified: true, mfaComplete: true });
          setAuthStep('complete');
          // Fetch user role before setting loading to false
          try {
            await api.get('/admin/users');
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
