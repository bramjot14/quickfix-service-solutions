import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { workerAPI, jobsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { Spinner, VerifiedBadge, Alert, JobStatusBadge, StarRating } from '../../components/ui';
import { formatDistanceToNow, format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

// ── Helper: generate next 14 days for date picker ─────────
function getAvailableDates() {
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(new Date(), i);
    dates.push({
      value: format(d, 'MMMM d, yyyy (EEEE)'),
      label: i === 0 ? 'Today – ' + format(d, 'MMMM d') : i === 1 ? 'Tomorrow – ' + format(d, 'MMMM d') : format(d, 'EEEE, MMMM d')
    });
  }
  return dates;
}

const TIME_SLOTS = [
  '7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM',
  '7:00 PM','7:30 PM','8:00 PM',
];

// ═══════════════════════════════════════════════════════════
//  WORKER DASHBOARD
// ═══════════════════════════════════════════════════════════
export function WorkerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workerAPI.getDashboard().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container py-20 flex justify-center"><Spinner size="lg" /></div>;

  const profile = data?.profile;
  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="section-title">Worker Dashboard</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-500">Hello, {user?.firstName}!</span>
                <VerifiedBadge status={profile?.verificationStatus} />
              </div>
            </div>
            <Link to="/worker/verification" className="btn-secondary text-sm">🛡️ Verification</Link>
          </div>
        </div>
      </div>

      <div className="page-container py-8">
        {profile?.verificationStatus !== 'APPROVED' && (
          <Alert type="warning" className="mb-6">
            <strong>Not yet verified.</strong> Upload your Government ID, Trade Certificate, and a recent profile photo to start bidding.{' '}
            <Link to="/worker/verification" className="font-semibold underline">Complete verification →</Link>
          </Alert>
        )}

        {profile?.verificationStatus === 'APPROVED' && !profile?.profilePhotoUrl && (
          <Alert type="warning" className="mb-6">
            <strong>Profile photo missing.</strong> Please upload a recent profile photo (taken within 6 months).{' '}
            <Link to="/worker/verification" className="font-semibold underline">Upload photo →</Link>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Bids', value: stats?.activeBids, icon: '📤', link: '/jobs/browse' },
            { label: 'Assigned Jobs', value: stats?.assignedJobs, icon: '🔧', link: '/jobs/browse' },
            { label: 'Completed', value: stats?.completedJobs, icon: '✅', link: '/jobs/browse' },
            { label: 'Avg Rating', value: profile?.avgRating ? `${profile.avgRating}★` : '—', icon: '⭐', link: null },
          ].map(s => (
            <div key={s.label} className="card p-5">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="font-display font-black text-3xl text-slate-900">{s.value ?? '—'}</div>
              <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
              {s.link && <Link to={s.link} className="text-xs text-brand-600 hover:underline mt-1 block">View →</Link>}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/jobs/browse" className="card p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
            <span className="text-3xl mb-3 block">💼</span>
            <h3 className="font-display font-bold text-slate-900 mb-1">Browse Jobs</h3>
            <p className="text-sm text-slate-500">Find open jobs in your area</p>
          </Link>
          <Link to="/worker/verification" className="card p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
            <span className="text-3xl mb-3 block">🛡️</span>
            <h3 className="font-display font-bold text-slate-900 mb-1">Verification</h3>
            <p className="text-sm text-slate-500">Documents, profile photo & status</p>
          </Link>
          <Link to="/worker/availability" className="card p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
            <span className="text-3xl mb-3 block">🟢</span>
            <h3 className="font-display font-bold text-slate-900 mb-1">Availability</h3>
            <p className="text-sm text-slate-500">Set your status and response time</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  BROWSE JOBS
// ═══════════════════════════════════════════════════════════
export function BrowseJobs() {
  const [jobs, setJobs] = useState([]);
  const [unverified, setUnverified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filter, setFilter] = useState({ category: '', city: '' });

  const loadJobs = () => {
    setLoading(true);
    jobsAPI.getOpenJobs(filter)
      .then(r => { setJobs(r.data.jobs); setPagination(r.data.pagination); setUnverified(false); })
      .catch(err => { if (err.response?.status === 403) setUnverified(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadJobs(); }, [filter.category, filter.city]);

  if (unverified) return (
    <div className="page-container py-20">
      <Alert type="warning">
        <strong>Verification required.</strong> Only verified workers can browse and bid on jobs.{' '}
        <Link to="/worker/verification" className="font-semibold underline">Get verified →</Link>
      </Alert>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8">
          <h1 className="section-title mb-4">Browse Open Jobs</h1>
          <div className="flex gap-3 flex-wrap">
            <input value={filter.category} onChange={e => setFilter(p => ({...p, category: e.target.value}))}
              placeholder="Filter by category..." className="input max-w-xs py-2" />
            <input value={filter.city} onChange={e => setFilter(p => ({...p, city: e.target.value}))}
              placeholder="Filter by city..." className="input max-w-xs py-2" />
          </div>
        </div>
      </div>
      <div className="page-container py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No open jobs found. Check back soon!</div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="card p-5 block hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {job.isEmergency && <span className="badge-emergency">🚨 Emergency</span>}
                      <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900">{job.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {job.category} · {job.locationCity}
                      {job.budgetMin && ` · Budget: $${job.budgetMin}–$${job.budgetMax}`}
                    </p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{job.description}</p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <div className="text-sm font-bold text-slate-600">{job._count?.bids || 0}</div>
                    <div className="text-xs text-slate-400">bids</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  WORKER JOB DETAIL — bid form, job flow, chat
// ═══════════════════════════════════════════════════════════
export function WorkerJobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myBid, setMyBid] = useState(null);
  const [bidForm, setBidForm] = useState({
    price: '', etaMins: 60, message: '', availableNow: false,
    scheduledDate: '', scheduledTime: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [tab, setTab] = useState('job');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const messagesEndRef = useRef(null);
  const DATES = getAvailableDates();

  const loadJob = async () => {
    const r = await jobsAPI.getJob(id).catch(() => null);
    if (!r) return;
    setJob(r.data);
    const myB = r.data.bids?.find(b => b.workerId === user?.id);
    if (myB) { setMyBid(myB); setBidForm(p => ({...p, price: myB.price, etaMins: myB.etaMins, message: myB.message, scheduledDate: myB.scheduledDate||'', scheduledTime: myB.scheduledTime||''})); }
    if (['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(r.data.status)) {
      const msgs = await jobsAPI.getMessages(id).catch(() => ({ data: [] }));
      setMessages(msgs.data);
      if (r.data.assignedWorkerId === user?.id && tab === 'job') setTab('chat');
    }
    setLoading(false);
  };

  useEffect(() => { loadJob(); }, [id]);

  useEffect(() => {
    socket.joinJob(id);
    const off1 = socket.on('new_message', msg => setMessages(p => [...p, msg]));
    const off2 = socket.on('job_status_updated', ({ status }) => setJob(p => p ? {...p, status} : p));
    const off3 = socket.on('payment_released', () => { toast.success('🎉 Payment released by admin!'); loadJob(); });
    return () => { socket.leaveJob(id); off1(); off2(); off3(); };
  }, [id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!bidForm.scheduledDate) { toast.error('Please select a date for the visit'); return; }
    if (!bidForm.scheduledTime) { toast.error('Please select a time for the visit'); return; }
    setSubmitting(true);
    try {
      await jobsAPI.placeBid(id, bidForm);
      toast.success('Bid submitted!');
      await loadJob();
      setTab('job');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place bid');
    } finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async (status) => {
    setUpdatingStatus(true);
    try {
      await jobsAPI.updateStatus(id, status);
      setJob(p => p ? {...p, status, completedAt: status === 'COMPLETED' ? new Date().toISOString() : p?.completedAt} : p);
      toast.success(status === 'IN_PROGRESS' ? '✅ Job started!' : '🎉 Job marked as complete!');
      if (status === 'COMPLETED') setTab('chat');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setUpdatingStatus(false); }
  };

  const handleRequestPayment = async () => {
    setRequestingPayment(true);
    try {
      await jobsAPI.requestPaymentWorker(id);
      toast.success('Payment requested! Admin has been notified.');
      await loadJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setRequestingPayment(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    socket.sendMessage(id, msgText);
    setMsgText('');
  };

  if (loading) return <div className="page-container py-20 flex justify-center"><Spinner size="lg" /></div>;
  if (!job) return <div className="page-container py-20 text-center text-slate-500">Job not found</div>;

  const isAssigned = job.assignedWorkerId === user?.id;
  const canChat = isAssigned && ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(job.status);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-slate-100 sticky top-16 z-40">
        <div className="page-container py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/jobs/browse" className="text-slate-400 hover:text-slate-600 flex-shrink-0">← Back</Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-slate-900 truncate">{job.title}</h1>
                <JobStatusBadge status={job.status} />
              </div>
              <p className="text-xs text-slate-400">{job.category} · {job.locationCity}</p>
            </div>
          </div>

          {/* Action buttons for assigned worker */}
          {isAssigned && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {job.status === 'ASSIGNED' && (
                <button onClick={() => handleStatusUpdate('IN_PROGRESS')}
                  disabled={updatingStatus}
                  className="btn-primary bg-blue-500 hover:bg-blue-600 text-sm py-2">
                  {updatingStatus ? <Spinner size="sm" /> : '▶ Start Job'}
                </button>
              )}
              {job.status === 'IN_PROGRESS' && (
                <button onClick={() => handleStatusUpdate('COMPLETED')}
                  disabled={updatingStatus}
                  className="btn-primary bg-emerald-500 hover:bg-emerald-600 text-sm py-2">
                  {updatingStatus ? <Spinner size="sm" /> : '✅ Job Done'}
                </button>
              )}
              {job.status === 'COMPLETED' && job.paymentStatus === 'PENDING' && (
                <button onClick={handleRequestPayment}
                  disabled={requestingPayment}
                  className="btn-primary bg-amber-500 hover:bg-amber-600 text-sm py-2">
                  {requestingPayment ? <Spinner size="sm" /> : '💰 Request Payment'}
                </button>
              )}
              {job.paymentStatus === 'REQUESTED' && (
                <span className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
                  ⏳ Payment requested — waiting for customer
                </span>
              )}
              {job.paymentStatus === 'CUSTOMER_PAID' && (
                <span className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-semibold">
                  ✅ Customer paid — admin processing release
                </span>
              )}
              {job.paymentStatus === 'RELEASED' && (
                <span className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
                  🎉 Payment released by admin!
                </span>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-3 overflow-x-auto">
            {[
              { id: 'job', label: 'Job Info' },
              { id: 'bid', label: myBid ? '✓ My Bid' : 'Place Bid', hidden: isAssigned },
              { id: 'chat', label: 'Chat', hidden: !canChat },
            ].filter(t => !t.hidden).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${tab === t.id ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-container py-6 max-w-2xl mx-auto">
        {/* Payment status alerts */}
        {isAssigned && job.status === 'ASSIGNED' && (
          <Alert type="info" className="mb-4">
            <strong>You're assigned!</strong> Click <strong>▶ Start Job</strong> when you arrive and begin work.
          </Alert>
        )}
        {isAssigned && job.status === 'IN_PROGRESS' && (
          <Alert type="info" className="mb-4">
            Job is in progress. Click <strong>✅ Job Done</strong> when work is complete, then request payment.
          </Alert>
        )}

        {/* JOB INFO TAB */}
        {tab === 'job' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-display font-bold text-lg mb-4">Job Description</h2>
              <p className="text-slate-700 leading-relaxed mb-4">{job.description}</p>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                {[
                  { label: 'Category', value: job.category },
                  { label: 'City', value: job.locationCity },
                  { label: 'Budget', value: job.budgetMin ? `$${job.budgetMin}–$${job.budgetMax}` : 'Open' },
                  { label: 'Emergency', value: job.isEmergency ? '🚨 Yes' : 'No' },
                  { label: 'Status', value: job.status },
                  { label: 'Agreed Price', value: job.agreedPrice ? `$${job.agreedPrice}` : '—' },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-slate-400">{f.label}</p>
                    <p className="font-medium text-sm text-slate-800">{f.value}</p>
                  </div>
                ))}
              </div>
              {job.mediaUrls?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-500 mb-2">Customer Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {job.mediaUrls.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BID TAB */}
        {tab === 'bid' && !isAssigned && (
          <div className="card p-6">
            <h2 className="font-display font-bold text-lg mb-4">
              {myBid ? 'Update Your Bid' : 'Place a Bid'}
            </h2>
            {myBid && (
              <Alert type="success" className="mb-4">
                Your bid: <strong>${myBid.price}</strong> on <strong>{myBid.scheduledDate}</strong> at <strong>{myBid.scheduledTime}</strong>
              </Alert>
            )}
            <form onSubmit={handlePlaceBid} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Your Price ($) *</label>
                  <input type="number" value={bidForm.price} onChange={e => setBidForm(p => ({...p, price: e.target.value}))}
                    placeholder="250" min="1" className="input" required />
                </div>
                <div>
                  <label className="label">ETA to arrive (mins) *</label>
                  <select value={bidForm.etaMins} onChange={e => setBidForm(p => ({...p, etaMins: parseInt(e.target.value)}))} className="input">
                    {[15,30,45,60,90,120,180,240].map(m => <option key={m} value={m}>{m < 60 ? `${m}m` : `${m/60}h`}</option>)}
                  </select>
                </div>
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="label">📅 Scheduled Visit Date *</label>
                <select value={bidForm.scheduledDate} onChange={e => setBidForm(p => ({...p, scheduledDate: e.target.value}))}
                  className="input" required>
                  <option value="">Select a date</option>
                  {DATES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="label">🕐 Scheduled Visit Time *</label>
                <select value={bidForm.scheduledTime} onChange={e => setBidForm(p => ({...p, scheduledTime: e.target.value}))}
                  className="input" required>
                  <option value="">Select a time</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {bidForm.scheduledDate && bidForm.scheduledTime && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800 font-medium">
                  📅 You will visit on <strong>{bidForm.scheduledDate}</strong> at <strong>{bidForm.scheduledTime}</strong>
                </div>
              )}

              <div>
                <label className="label">Message to Customer *</label>
                <textarea value={bidForm.message} onChange={e => setBidForm(p => ({...p, message: e.target.value}))}
                  rows={3} placeholder="Describe your approach and why you're the right fit..."
                  className="input resize-none" required maxLength={500} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bidForm.availableNow} onChange={e => setBidForm(p => ({...p, availableNow: e.target.checked}))}
                  className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-slate-700">🟢 I'm available to start now (sooner than scheduled)</span>
              </label>

              <button type="submit" disabled={submitting || job.status !== 'OPEN'} className="btn-primary w-full">
                {submitting ? <><Spinner size="sm" /> Submitting...</> : myBid ? 'Update Bid' : 'Submit Bid →'}
              </button>
              {job.status !== 'OPEN' && <p className="text-sm text-slate-500 text-center">This job is no longer accepting bids</p>}
            </form>
          </div>
        )}

        {/* CHAT TAB */}
        {tab === 'chat' && canChat && (
          <div className="card overflow-hidden">
            <div className="h-96 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Say hello to the customer!</div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${isMe ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {msg.sender?.firstName?.[0]}
                      </div>
                      <div className={`max-w-xs flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm
                          ${isMe ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'}`}>
                          {msg.text}
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5">{format(new Date(msg.createdAt), 'h:mm a')}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-slate-200 p-3">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input value={msgText} onChange={e => setMsgText(e.target.value)}
                  placeholder="Message customer..." className="input flex-1 py-2.5 text-sm" />
                <button type="submit" className="btn-primary py-2.5 px-4" disabled={!msgText.trim()}>Send</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  AVAILABILITY
// ═══════════════════════════════════════════════════════════
export function WorkerAvailability() {
  const [avail, setAvail] = useState({ isAvailable: false, responseMinutes: 30 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    workerAPI.getAvailability().then(r => setAvail(r.data)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await workerAPI.setAvailability(avail);
      toast.success('Availability updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page-container py-20 flex justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8 max-w-lg mx-auto">
          <h1 className="section-title mb-1">Availability Settings</h1>
          <p className="text-slate-500">Control when customers can see and hire you</p>
        </div>
      </div>
      <div className="page-container py-8 max-w-lg mx-auto">
        <div className="card p-6 space-y-6">
          <label className="flex items-center gap-3 cursor-pointer" onClick={() => setAvail(p => ({...p, isAvailable: !p.isAvailable}))}>
            <div className={`relative w-12 h-6 rounded-full transition-colors ${avail.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${avail.isAvailable ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
            <div>
              <span className="font-semibold text-slate-900">Available for New Jobs</span>
              <p className="text-xs text-slate-500">When on, you appear in "Available Now" filters</p>
            </div>
          </label>
          <div>
            <label className="label">Typical Response Time</label>
            <select value={avail.responseMinutes} onChange={e => setAvail(p => ({...p, responseMinutes: parseInt(e.target.value)}))} className="input">
              {[15,30,45,60,90,120,180,240].map(m => <option key={m} value={m}>{m < 60 ? `~${m} minutes` : `~${m/60} hour${m/60 > 1 ? 's' : ''}`}</option>)}
            </select>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
