import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jobsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { JobStatusBadge, StarRating, VerifiedBadge, Spinner, Alert } from '../../components/ui';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { track } from '../../lib/api';

// ── Dummy Payment Modal ───────────────────────────────────
function PaymentModal({ job, onClose, onPaid }) {
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [paying, setPaying] = useState(false);

  const formatNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? d.slice(0,2) + '/' + d.slice(2) : d;
  };

  const handlePay = async () => {
    if (!card.name || !card.number || !card.expiry || !card.cvv) {
      toast.error('Please fill in all card details'); return;
    }
    const digits = card.number.replace(/\s/g, '');
    if (digits.length !== 16) { toast.error('Enter a valid 16-digit card number'); return; }
    if (card.cvv.length < 3) { toast.error('Enter a valid CVV'); return; }

    setPaying(true);
    try {
      await jobsAPI.customerPay(job.id, { dummyCardLast4: digits.slice(-4), dummyCardName: card.name });
      toast.success(`Payment of $${job.agreedPrice} sent to QuickFix Admin!`);
      onPaid();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-enter">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-display font-bold text-xl">Pay for Job</h2>
          <p className="text-slate-500 text-sm mt-0.5">Payment goes to QuickFix Admin securely</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 bg-brand-50 rounded-xl border border-brand-200 flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-600">{job.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">To: QuickFix Admin (held in escrow)</p>
            </div>
            <span className="font-display font-black text-2xl text-brand-600">${job.agreedPrice}</span>
          </div>

          <div>
            <label className="label">Cardholder Name</label>
            <input value={card.name} onChange={e => setCard(p => ({...p, name: e.target.value}))}
              placeholder="John Smith" className="input" />
          </div>
          <div>
            <label className="label">Card Number</label>
            <input value={card.number}
              onChange={e => setCard(p => ({...p, number: formatNumber(e.target.value)}))}
              placeholder="1234 5678 9012 3456" className="input font-mono" maxLength={19} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Expiry</label>
              <input value={card.expiry}
                onChange={e => setCard(p => ({...p, expiry: formatExpiry(e.target.value)}))}
                placeholder="MM/YY" className="input" maxLength={5} />
            </div>
            <div>
              <label className="label">CVV</label>
              <input value={card.cvv}
                onChange={e => setCard(p => ({...p, cvv: e.target.value.replace(/\D/g,'').slice(0,4)}))}
                placeholder="•••" className="input" maxLength={4} type="password" />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-start gap-2">
            <span>🔒</span>
            <span>This is a demo payment. No real charges will be made. Admin will release payment to worker after verification.</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handlePay} disabled={paying} className="btn-primary flex-1 bg-emerald-500 hover:bg-emerald-600">
              {paying ? <><Spinner size="sm" /> Processing...</> : `Pay $${job.agreedPrice}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cancel Modal ─────────────────────────────────────────
function CancelModal({ job, onClose, onCancelled }) {
  const [reason, setReason] = useState('customer_choice');
  const [cancelling, setCancelling] = useState(false);
  const isAssigned = ['ASSIGNED', 'IN_PROGRESS'].includes(job.status);
  const workerNoShow = reason === 'worker_no_show';
  const penalty = isAssigned && !workerNoShow;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await jobsAPI.cancelJob(job.id, { workerNoShow });
      toast.success(res.data.message || 'Job cancelled');
      if (res.data.penaltyRequired) {
        toast('⚠️ $100 cancellation fee applies. Please contact admin.', { duration: 8000 });
      }
      onCancelled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-enter">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-display font-bold text-xl text-red-600">Cancel Job</h2>
          <p className="text-slate-500 text-sm mt-0.5">Please select a reason for cancellation</p>
        </div>
        <div className="p-6 space-y-4">
          {isAssigned && (
            <div className="space-y-2">
              <label className="label">Reason *</label>
              {[
                { value: 'customer_choice', label: 'I changed my mind / No longer needed' },
                { value: 'worker_no_show', label: "Worker didn't show up on time" },
                { value: 'other', label: 'Other reason' },
              ].map(opt => (
                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                  ${reason === opt.value ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="reason" value={opt.value}
                    checked={reason === opt.value} onChange={() => setReason(opt.value)}
                    className="accent-brand-500" />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {penalty ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-semibold text-red-700 text-sm">⚠️ $100 Cancellation Fee Applies</p>
              <p className="text-red-600 text-xs mt-1">
                A worker has already been assigned to your job. Cancelling now requires a $100 penalty fee.
                To avoid this fee, please select "Worker didn't show up" if applicable.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              {isAssigned && workerNoShow
                ? '✓ No cancellation fee — worker did not show up.'
                : '✓ No cancellation fee for open jobs.'}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Keep Job</button>
            <button onClick={handleCancel} disabled={cancelling}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all text-white
                ${penalty ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-600 hover:bg-slate-700'}`}>
              {cancelling ? <Spinner size="sm" /> : penalty ? 'Cancel (+ $100 Fee)' : 'Cancel Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [job, setJob] = useState(null);
  const [bids, setBids] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [activeTab, setActiveTab] = useState('bids');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [showReview, setShowReview] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const messagesEndRef = useRef(null);

  const loadJob = async () => {
    try {
      const [jobRes, bidsRes] = await Promise.all([
        jobsAPI.getJob(id),
        jobsAPI.getBids(id).catch(() => ({ data: [] })),
      ]);
      setJob(jobRes.data);
      setBids(bidsRes.data || []);
      setEditForm({ title: jobRes.data.title, description: jobRes.data.description, budgetMin: jobRes.data.budgetMin, budgetMax: jobRes.data.budgetMax });
      if (['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(jobRes.data.status)) {
        const msgs = await jobsAPI.getMessages(id).catch(() => ({ data: [] }));
        setMessages(msgs.data);
        setActiveTab('chat');
        track('chat_opened', { jobId: id });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJob(); }, [id]);

  useEffect(() => {
    if (!id) return;
    socket.joinJob(id);
    const off1 = socket.on('new_bid', (bid) => {
      setBids(prev => {
        const i = prev.findIndex(b => b.id === bid.id);
        if (i >= 0) { const u = [...prev]; u[i] = bid; return u; }
        toast.success(`New bid from ${bid.worker?.firstName}!`);
        return [...prev, bid];
      });
    });
    const off2 = socket.on('new_message', msg => setMessages(prev => [...prev, msg]));
    const off3 = socket.on('job_assigned', () => loadJob());
    const off4 = socket.on('job_status_updated', ({ status }) => setJob(p => p ? {...p, status} : p));
    const off5 = socket.on('payment_released', () => { toast.success('🎉 Payment released to worker!'); loadJob(); });
    return () => { socket.leaveJob(id); off1(); off2(); off3(); off4(); off5(); };
  }, [id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleAssign = async (workerId) => {
    setAssigning(workerId);
    try {
      await jobsAPI.assignWorker(id, workerId);
      await loadJob();
      setActiveTab('chat');
      toast.success('Worker assigned! Chat is now open.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign worker');
    } finally { setAssigning(null); }
  };

  const handleEditSave = async () => {
    try {
      await jobsAPI.updateJob(id, editForm);
      toast.success('Job updated');
      setEditMode(false);
      await loadJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    socket.sendMessage(id, msgText);
    setMsgText('');
  };

  const handleSubmitReview = async () => {
    try {
      await jobsAPI.submitReview(id, reviewForm);
      toast.success('Review submitted!');
      setShowReview(false);
      await loadJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return <div className="page-container py-20 flex justify-center"><Spinner size="lg" /></div>;
  if (!job) return <div className="page-container py-20 text-center text-slate-500">Job not found</div>;

  const isOwner = job.customerId === user?.id;
  const canChat = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(job.status);
  const hasReview = job.reviews?.some(r => r.reviewerId === user?.id);
  const canCancel = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(job.status);
  const canEdit = job.status === 'OPEN';
  const needsPayment = job.status === 'COMPLETED' && job.paymentStatus === 'REQUESTED';
  const hasPaid = ['CUSTOMER_PAID', 'RELEASED'].includes(job.paymentStatus);

  return (
    <div className="min-h-screen bg-slate-50">
      {showPayment && <PaymentModal job={job} onClose={() => setShowPayment(false)} onPaid={loadJob} />}
      {showCancel && <CancelModal job={job} onClose={() => setShowCancel(false)} onCancelled={() => navigate('/customer/jobs')} />}

      {/* Sticky header */}
      <div className="bg-white border-b border-slate-100 sticky top-16 z-40">
        <div className="page-container py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/customer/jobs" className="text-slate-400 hover:text-slate-600 flex-shrink-0">← Back</Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-bold text-slate-900 text-lg truncate">{job.title}</h1>
                  <JobStatusBadge status={job.status} />
                  {job.isEmergency && <span className="badge-emergency">🚨 Emergency</span>}
                </div>
                <p className="text-xs text-slate-400">{job.category} · {job.locationCity} · {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {canEdit && isOwner && !editMode && (
                <button onClick={() => setEditMode(true)} className="btn-secondary text-sm py-2">✏️ Edit</button>
              )}
              {canCancel && isOwner && (
                <button onClick={() => setShowCancel(true)} className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-2 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                  Cancel Job
                </button>
              )}
              {needsPayment && (
                <button onClick={() => setShowPayment(true)} className="btn-primary text-sm py-2 bg-emerald-500 hover:bg-emerald-600 animate-pulse">
                  💳 Pay Now — ${job.agreedPrice}
                </button>
              )}
              {hasPaid && !hasReview && job.status === 'COMPLETED' && (
                <button onClick={() => setShowReview(true)} className="btn-primary text-sm py-2">⭐ Leave Review</button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 overflow-x-auto">
            {[
              { id: 'bids', label: `Bids (${bids.length})` },
              { id: 'chat', label: `Chat`, show: canChat },
              { id: 'details', label: 'Details' },
            ].filter(t => t.show !== false).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${activeTab === tab.id ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-container py-6 max-w-3xl mx-auto">
        {/* Payment status alerts */}
        {needsPayment && (
          <Alert type="warning" className="mb-4">
            <strong>💰 Worker has requested payment!</strong> Please pay ${job.agreedPrice} to QuickFix Admin to release funds to the worker.
            <button onClick={() => setShowPayment(true)} className="ml-2 underline font-semibold">Pay Now</button>
          </Alert>
        )}
        {job.paymentStatus === 'CUSTOMER_PAID' && (
          <Alert type="info" className="mb-4">
            <strong>✅ Payment received by Admin.</strong> Funds will be released to the worker shortly.
          </Alert>
        )}
        {job.paymentStatus === 'RELEASED' && (
          <Alert type="success" className="mb-4">
            <strong>🎉 Payment complete!</strong> Admin has released funds to the worker. Thank you for using QuickFix!
          </Alert>
        )}
        {job.cancellationPenalty && (
          <Alert type="error" className="mb-4">
            <strong>⚠️ $100 Cancellation Penalty Applied.</strong> Please contact admin to arrange payment.
          </Alert>
        )}

        {/* Review form */}
        {showReview && !hasReview && (
          <div className="card p-6 mb-6 border-brand-200 bg-brand-50 animate-enter">
            <h3 className="font-display font-bold text-lg mb-4">⭐ Leave a Review</h3>
            <div className="mb-3">
              <label className="label">Rating</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setReviewForm(p => ({...p, rating: s}))}
                    className={`text-2xl transition-transform hover:scale-110 ${s <= reviewForm.rating ? '' : 'opacity-30'}`}>⭐</button>
                ))}
              </div>
            </div>
            <textarea value={reviewForm.comment} onChange={e => setReviewForm(p => ({...p, comment: e.target.value}))}
              rows={3} placeholder="Share your experience..." className="input resize-none mb-4" />
            <div className="flex gap-2">
              <button onClick={handleSubmitReview} className="btn-primary" disabled={!reviewForm.comment}>Submit Review</button>
              <button onClick={() => setShowReview(false)} className="btn-secondary">Later</button>
            </div>
          </div>
        )}

        {/* BIDS TAB */}
        {activeTab === 'bids' && (
          <div className="space-y-3">
            {job.status === 'OPEN' && (
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Waiting for bids... Verified pros are notified in real-time
              </div>
            )}
            {bids.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="font-semibold text-slate-700">No bids yet</p>
                <p className="text-sm text-slate-500 mt-1">Verified pros will start bidding shortly</p>
              </div>
            ) : (
              bids.map(bid => (
                <div key={bid.id} className={`card p-5 animate-enter ${bid.status === 'ACCEPTED' ? 'border-emerald-300 bg-emerald-50' : ''}`}>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-brand-100 flex-shrink-0">
                      {bid.worker?.workerProfile?.profilePhotoUrl || bid.worker?.avatarUrl ? (
                        <img src={bid.worker.workerProfile?.profilePhotoUrl || bid.worker.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-700 font-bold">
                          {bid.worker?.firstName?.[0]}{bid.worker?.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/pros/${bid.worker?.id}`} className="font-semibold text-slate-900 hover:text-brand-600">
                              {bid.worker?.firstName} {bid.worker?.lastName}
                            </Link>
                            <VerifiedBadge status={bid.worker?.workerProfile?.verificationStatus} />
                            {bid.availableNow && <span className="badge-verified">🟢 Available Now</span>}
                          </div>
                          {bid.worker?.workerProfile?.avgRating > 0 && (
                            <StarRating rating={bid.worker.workerProfile.avgRating} count={bid.worker.workerProfile.reviewsCount} />
                          )}
                          {/* Scheduled date/time */}
                          {bid.scheduledDate && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-600 bg-slate-100 rounded-lg px-2 py-1 w-fit">
                              📅 {bid.scheduledDate} at {bid.scheduledTime}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-display font-black text-2xl text-slate-900">${bid.price}</div>
                          <div className="text-xs text-slate-500">ETA: {bid.etaMins < 60 ? `${bid.etaMins}m` : `${Math.round(bid.etaMins/60)}h`}</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{bid.message}</p>

                      {job.status === 'OPEN' && bid.status === 'PENDING' && isOwner && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => handleAssign(bid.worker.id)}
                            disabled={assigning === bid.worker.id}
                            className="btn-primary text-sm py-2">
                            {assigning === bid.worker.id ? <Spinner size="sm" /> : '✓ Hire This Pro'}
                          </button>
                          <Link to={`/pros/${bid.worker?.id}`} className="btn-secondary text-sm py-2">View Profile</Link>
                        </div>
                      )}
                      {bid.status === 'ACCEPTED' && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-700 font-semibold">✓ Hired</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && canChat && (
          <div className="card overflow-hidden">
            <div className="h-96 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Say hello to start the conversation!</div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isMe ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {msg.sender?.firstName?.[0]}
                      </div>
                      <div className={`max-w-xs lg:max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'}`}>
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
            <div className="border-t border-slate-200 p-3 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Type a message..."
                  className="input flex-1 py-2.5 text-sm" onKeyDown={() => socket.sendTyping(id)} />
                <button type="submit" className="btn-primary py-2.5 px-4" disabled={!msgText.trim()}>Send</button>
              </form>
            </div>
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">Job Details</h2>
              {canEdit && isOwner && !editMode && (
                <button onClick={() => setEditMode(true)} className="btn-secondary text-sm py-1.5">✏️ Edit</button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input value={editForm.title} onChange={e => setEditForm(p => ({...p, title: e.target.value}))} className="input" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea value={editForm.description} onChange={e => setEditForm(p => ({...p, description: e.target.value}))}
                    rows={4} className="input resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Budget Min ($)</label>
                    <input type="number" value={editForm.budgetMin || ''} onChange={e => setEditForm(p => ({...p, budgetMin: e.target.value}))} className="input" />
                  </div>
                  <div>
                    <label className="label">Budget Max ($)</label>
                    <input type="number" value={editForm.budgetMax || ''} onChange={e => setEditForm(p => ({...p, budgetMax: e.target.value}))} className="input" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEditSave} className="btn-primary text-sm">Save Changes</button>
                  <button onClick={() => setEditMode(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-slate-700 leading-relaxed mb-4">{job.description}</p>
                {job.mediaUrls?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-500 mb-2">Photos</p>
                    <div className="flex gap-2 flex-wrap">
                      {job.mediaUrls.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-xl border border-slate-200" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  {[
                    { label: 'Category', value: job.category },
                    { label: 'Location', value: job.locationCity },
                    { label: 'Budget', value: job.budgetMin ? `$${job.budgetMin}–$${job.budgetMax}` : 'Flexible' },
                    { label: 'Agreed Price', value: job.agreedPrice ? `$${job.agreedPrice}` : '—' },
                    { label: 'Status', value: job.status },
                    { label: 'Payment', value: job.paymentStatus },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-slate-400">{f.label}</p>
                      <p className="font-medium text-slate-800 text-sm">{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* Rehire */}
                {job.status === 'COMPLETED' && job.assignedWorkerId && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Link to={`/post/${encodeURIComponent(job.category)}/${job.assignedWorkerId}`} className="btn-secondary text-sm">
                      🔄 Rehire Same Pro
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
