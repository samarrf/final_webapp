import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <main><p style={{ color: 'var(--ink-soft)' }}>Loading…</p></main>;
  }
  if (!user || user.role !== role) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
