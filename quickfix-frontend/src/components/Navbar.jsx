import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const dashboardLink = user?.role === 'CUSTOMER' ? '/customer/jobs'
    : user?.role === 'WORKER' ? '/worker/dashboard'
    : user?.role === 'ADMIN' ? '/admin/verifications'
    : null;

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl text-slate-900">
            <span className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white text-sm font-black">Q</span>
            <span>Quick<span className="text-brand-500">Fix</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/services" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${isActive('/services') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              Browse Services
            </Link>
            {user?.role === 'ADMIN' && (
              <>
                <Link to="/admin/verifications" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive('/admin/verifications') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  Verifications
                </Link>
                <Link to="/admin/payments" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive('/admin/payments') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  Payments
                </Link>
              </>
            )}
            {user?.role === 'CUSTOMER' && (
              <Link to="/post" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive('/post') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                Post a Job
              </Link>
            )}
            {user?.role === 'WORKER' && (
              <Link to="/jobs/browse" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive('/jobs/browse') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                Browse Jobs
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link to="/login" className="hidden md:block btn-ghost text-sm">Sign in</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-brand-700 font-bold text-sm">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-slate-700">{user.firstName}</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-enter">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                      <p className="text-sm font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.role?.toLowerCase()}</p>
                    </div>
                    {dashboardLink && (
                      <Link to={dashboardLink} onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>🏠</span> Dashboard
                      </Link>
                    )}
                    {user.role === 'WORKER' && (
                      <Link to="/worker/verification" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>🛡️</span> Verification
                      </Link>
                    )}
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <span>🚪</span> Sign out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white animate-enter">
          <div className="page-container py-3 flex flex-col gap-1">
            <Link to="/services" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Browse Services</Link>
            {user?.role === 'CUSTOMER' && <Link to="/post" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Post a Job</Link>}
            {user?.role === 'WORKER' && <Link to="/jobs/browse" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Browse Jobs</Link>}
            {!user && <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Sign In</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50">Get Started</Link>
            </>}
          </div>
        </div>
      )}
    </nav>
  );
}
