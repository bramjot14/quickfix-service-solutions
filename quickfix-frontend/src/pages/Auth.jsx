import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner, Alert } from '../components/ui';
import toast from 'react-hot-toast';

const TERMS_TEXT = `QuickFix Service Solutions – Terms and Conditions

1. Introduction
These Terms and Conditions govern the use of the QuickFix Service Solutions platform ("QuickFix", "the Platform", "we", "us", or "our"). QuickFix is a web-based application developed as part of a college capstone project for academic purposes. By accessing or using the Platform, including creating an account as a customer or worker, you agree to be bound by these Terms and Conditions.

2. Nature of the Platform
QuickFix operates solely as a digital marketplace that facilitates connections between individuals seeking services ("Customers") and independent individuals offering services ("Workers"). QuickFix does not provide, perform, or supervise any services listed on the Platform. All services are carried out by independent third parties, and QuickFix does not act as an employer, contractor, or agent of any user.

3. Independent Users
All Workers and Customers using the Platform act independently and are solely responsible for their actions, conduct, and interactions. QuickFix does not verify, guarantee, or endorse the qualifications, identity, or reliability of any user. Users are responsible for conducting their own due diligence before engaging in any service or transaction.

4. Limitation of Liability
To the fullest extent permitted by law, QuickFix shall not be held liable for any direct, indirect, incidental, consequential, or special damages arising out of or in connection with the use of the Platform. This includes, but is not limited to, personal injury, property damage, theft, loss, misconduct, negligence, disputes, or any unlawful acts committed by any user of the Platform. By using QuickFix, you acknowledge and agree that all interactions and engagements are undertaken at your own risk.

5. No Responsibility for User Conduct
QuickFix does not control, monitor, or assume responsibility for the behavior, communication, or actions of users on or off the Platform. Any agreement, service, or interaction between a Customer and a Worker is solely between those parties. QuickFix shall not be responsible for the outcome, quality, safety, legality, or completion of any services.

6. Safety and Risk Acknowledgment
Users acknowledge that engaging with individuals through an online platform carries inherent risks. QuickFix does not conduct comprehensive background checks or guarantee user safety. Users are advised to take appropriate precautions, including verifying information, meeting in safe environments, and avoiding the sharing of sensitive personal or financial information.

7. Emergency Situations
QuickFix is not an emergency service provider. In the event of an emergency, unsafe situation, or criminal activity, users must immediately contact local law enforcement or emergency services. In Canada, users should call 911 or the appropriate local authority. QuickFix does not provide real-time assistance or emergency response.

8. Dispute Resolution
Any disputes arising between users, including Customers and Workers, must be resolved directly between the involved parties or through appropriate legal channels. QuickFix is not obligated to mediate, arbitrate, or resolve disputes and bears no responsibility for any disagreements or claims between users.

9. Academic Project Disclaimer
QuickFix is developed as part of an academic project and is intended for demonstration and educational purposes only. The Platform may not include all features, safeguards, or security measures expected in a fully commercial application. Users acknowledge and accept these limitations when using the Platform.

10. Account Suspension and Termination
QuickFix reserves the right to suspend, restrict, or terminate any user account at its sole discretion if a user is found to be in violation of these Terms and Conditions or engaged in harmful, unlawful, or inappropriate behavior.

11. Acceptance of Terms
By creating an account or using the Platform, you confirm that you have read, understood, and agreed to these Terms and Conditions. You further acknowledge that QuickFix is not liable for any actions, damages, or incidents arising from the use of the Platform.`;

const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Painting', 'Roofing',
  'Landscaping', 'Cleaning', 'Moving', 'Appliance Repair', 'Flooring', 'Other'];

function TermsModal({ onClose, onAccepted }) {
  const scrollRef = useRef(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
    if (atBottom) setHasScrolled(true);
  }, []);

  const handleAccept = () => {
    if (!agreed) return;
    onAccepted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">Terms and Conditions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Please read carefully — scroll to the bottom to continue</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none ml-4">×</button>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
          style={{ minHeight: 0 }}
        >
          {TERMS_TEXT}
          <div className="h-4" />
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mt-4">
            <strong>Short Version:</strong> I agree that QuickFix is a marketplace platform connecting independent users and is not responsible for any services, actions, or incidents between customers and workers. I understand that I use the platform at my own risk and that in case of emergency I must contact local authorities.
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex-shrink-0">
          {!hasScrolled && (
            <p className="text-xs text-amber-600 text-center mb-3">
              ⬇ Please scroll to the bottom to enable the checkbox
            </p>
          )}
          <label className={`flex items-start gap-3 mb-4 cursor-pointer ${!hasScrolled ? 'opacity-40' : ''}`}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => hasScrolled && setAgreed(e.target.checked)}
              disabled={!hasScrolled}
              className="w-4 h-4 mt-0.5 accent-brand-500 flex-shrink-0"
            />
            <span className="text-sm text-slate-700">
              I have read and agree to the <strong>Terms and Conditions</strong> of QuickFix Service Solutions.
            </span>
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Decline</button>
            <button
              onClick={handleAccept}
              disabled={!agreed}
              className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              I Agree & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: searchParams.get('role') || 'CUSTOMER',
    category: '',
    city: 'Toronto',
    phone: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('You must read and agree to the Terms and Conditions to register');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters with a number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await register({ ...form, agreedToTerms: 'true' });
      toast.success(`Welcome to QuickFix, ${user.firstName}!`);
      if (user.role === 'WORKER') navigate('/worker/verification');
      else navigate('/customer/jobs');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      {showTerms && (
        <TermsModal
          onClose={() => setShowTerms(false)}
          onAccepted={() => { setTermsAccepted(true); setError(''); }}
        />
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-2xl text-slate-900 mb-6">
            <span className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-black">Q</span>
            Quick<span className="text-brand-500">Fix</span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 mt-1">Join thousands of homeowners and pros</p>
        </div>

        <div className="card p-8">
          {/* Role toggle */}
          <div className="flex rounded-xl border border-slate-200 p-1 mb-6">
            {[
              { value: 'CUSTOMER', label: '🏠 I need help' },
              { value: 'WORKER', label: '🔧 I provide services' },
            ].map(r => (
              <button key={r.value} type="button"
                onClick={() => set('role', r.value)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all
                  ${form.role === r.value ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                {r.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name *</label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                  placeholder="John" className="input" required />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                  placeholder="Smith" className="input" required />
              </div>
            </div>

            <div>
              <label className="label">Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@email.com" className="input" required />
            </div>

            <div>
              <label className="label">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+1 (416) 555-0100" className="input" />
            </div>

            <div>
              <label className="label">Password *</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="Min. 8 chars, must include a number" className="input" required minLength={8} />
            </div>

            {form.role === 'WORKER' && (
              <>
                <div>
                  <label className="label">Primary Category *</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)} className="input" required>
                    <option value="">Select your trade</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">City *</label>
                  <select value={form.city} onChange={e => set('city', e.target.value)} className="input">
                    {['Toronto', 'Mississauga', 'Brampton', 'Scarborough', 'North York', 'Etobicoke', 'Vaughan', 'Markham'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                  ℹ️ After registering, you must upload your <strong>Government ID</strong>, <strong>Trade Certificate</strong>, and a <strong>recent profile photo</strong> (taken within 6 months) before bidding on jobs.
                </div>
              </>
            )}

            {/* Terms & Conditions */}
            <div className="pt-2">
              <div className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors
                ${termsAccepted ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={() => {
                    if (!termsAccepted) {
                      setShowTerms(true);
                    } else {
                      setTermsAccepted(false);
                    }
                  }}
                  className="w-4 h-4 mt-0.5 accent-brand-500 flex-shrink-0 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-brand-600 font-semibold hover:underline"
                  >
                    Terms and Conditions
                  </button>
                  {' '}of QuickFix Service Solutions.{' '}
                  <span className="text-red-500 font-semibold">*</span>
                </label>
              </div>
              {!termsAccepted && (
                <p className="text-xs text-slate-500 mt-1 ml-1">
                  Click the link above to read the full Terms and Conditions
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full py-3.5" disabled={loading || !termsAccepted}>
              {loading ? <><Spinner size="sm" /> Creating account...</> : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'ADMIN') navigate('/admin/verifications');
      else if (user.role === 'WORKER') navigate('/worker/dashboard');
      else navigate('/customer/jobs');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-2xl text-slate-900 mb-6">
            <span className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-black">Q</span>
            Quick<span className="text-brand-500">Fix</span>
          </Link>
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@email.com" className="input" required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••" className="input" required />
            </div>
            <button type="submit" className="btn-primary w-full py-3.5" disabled={loading}>
              {loading ? <><Spinner size="sm" /> Signing in...</> : 'Sign In →'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 p-4 bg-slate-50 rounded-xl">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Demo accounts</p>
            {[
              { label: '👤 Admin', email: 'admin@quickfix.ca' },
              { label: '🏠 Customer', email: 'customer@quickfix.ca' },
              { label: '🔧 Worker (Plumber)', email: 'marcus.chen@quickfix.dev' },
            ].map(d => (
              <button key={d.email} type="button"
                onClick={() => setForm({ email: d.email, password: 'Password123!' })}
                className="w-full text-left text-xs text-slate-600 hover:text-brand-600 py-1 font-medium">
                {d.label} → {d.email}
              </button>
            ))}
            <p className="text-xs text-slate-400 mt-1">Password: Password123!</p>
          </div>

          <p className="text-center text-sm text-slate-500 mt-4">
            New to QuickFix?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:text-brand-700">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
