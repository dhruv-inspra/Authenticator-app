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
