import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Spinner } from './components/ui';

// Pages
import Landing from './pages/Landing';
import Services from './pages/Services';
import CategoryPros from './pages/CategoryPros';
import ProProfile from './pages/ProProfile';
import PostJob from './pages/PostJob';
import { Register, Login } from './pages/Auth';
import CustomerJobs from './pages/customer/Jobs';
import CustomerJobDetail from './pages/customer/JobDetail';
import WorkerVerification from './pages/worker/Verification';
import {
  WorkerDashboard,
  BrowseJobs,
  WorkerJobDetail,
  WorkerAvailability,
} from './pages/worker/WorkerPages';
import AdminVerifications from './pages/admin/Verifications';
import AdminPayments from './pages/admin/AdminPayments';

// ─── Route Guards ──────────────────────────────────────────
function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (roles && !roles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin/verifications" replace />;
    if (user.role === 'WORKER') return <Navigate to="/worker/dashboard" replace />;
    return <Navigate to="/customer/jobs" replace />;
  }

  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (user) {
    if (user.role === 'ADMIN') return <Navigate to="/admin/verifications" replace />;
    if (user.role === 'WORKER') return <Navigate to="/worker/dashboard" replace />;
    return <Navigate to="/customer/jobs" replace />;
  }
  return children;
}

function Layout({ children, noFooter }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Layout><Landing /></Layout>} />
      <Route path="/services" element={<Layout><Services /></Layout>} />
      <Route path="/services/:category" element={<Layout><CategoryPros /></Layout>} />
      <Route path="/pros/:id" element={<Layout><ProProfile /></Layout>} />

      {/* Post job */}
      <Route path="/post" element={<Layout noFooter><PostJob /></Layout>} />
      <Route path="/post/:category" element={<Layout noFooter><PostJob /></Layout>} />
      <Route path="/post/:category/:proId" element={<Layout noFooter><PostJob /></Layout>} />

      {/* Auth */}
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      {/* Customer */}
      <Route path="/customer/jobs" element={
        <RequireAuth roles={['CUSTOMER']}>
          <Layout noFooter><CustomerJobs /></Layout>
        </RequireAuth>
      } />
      <Route path="/customer/jobs/new" element={
        <RequireAuth roles={['CUSTOMER']}>
          <Layout noFooter><PostJob /></Layout>
        </RequireAuth>
      } />
      <Route path="/customer/jobs/:id" element={
        <RequireAuth roles={['CUSTOMER']}>
          <Layout noFooter><CustomerJobDetail /></Layout>
        </RequireAuth>
      } />

      {/* Worker */}
      <Route path="/worker/dashboard" element={
        <RequireAuth roles={['WORKER']}>
          <Layout noFooter><WorkerDashboard /></Layout>
        </RequireAuth>
      } />
      <Route path="/worker/verification" element={
        <RequireAuth roles={['WORKER']}>
          <Layout noFooter><WorkerVerification /></Layout>
        </RequireAuth>
      } />
      <Route path="/worker/availability" element={
        <RequireAuth roles={['WORKER']}>
          <Layout noFooter><WorkerAvailability /></Layout>
        </RequireAuth>
      } />
      <Route path="/jobs/browse" element={
        <RequireAuth roles={['WORKER']}>
          <Layout noFooter><BrowseJobs /></Layout>
        </RequireAuth>
      } />
      <Route path="/jobs/:id" element={
        <RequireAuth roles={['WORKER']}>
          <Layout noFooter><WorkerJobDetail /></Layout>
        </RequireAuth>
      } />

      {/* Admin */}
      <Route path="/admin/verifications" element={
        <RequireAuth roles={['ADMIN']}>
          <Layout noFooter><AdminVerifications /></Layout>
        </RequireAuth>
      } />
      <Route path="/admin/payments" element={
        <RequireAuth roles={['ADMIN']}>
          <Layout noFooter><AdminPayments /></Layout>
        </RequireAuth>
      } />

      {/* 404 */}
      <Route path="*" element={
        <Layout>
          <div className="page-container py-32 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="font-display text-4xl font-bold text-slate-900 mb-2">Page not found</h1>
            <p className="text-slate-500 mb-6">The page you're looking for doesn't exist.</p>
            <a href="/" className="btn-primary">← Back to Home</a>
          </div>
        </Layout>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
