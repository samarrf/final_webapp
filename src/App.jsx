import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from "./components/Header.jsx";
import Listings from './pages/Listings';
import Login from './pages/Login';
import LandlordDashboard from './pages/LandlordDashboard';
import TenantPortal from './pages/TenantPortal';

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Header/>
        <Routes>
          <Route path="/" element={<Listings />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="landlord">
                <LandlordDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal"
            element={
              <ProtectedRoute role="tenant">
                <TenantPortal />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}
