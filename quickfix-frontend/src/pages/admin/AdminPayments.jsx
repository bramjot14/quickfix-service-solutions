import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { Spinner, JobStatusBadge } from '../../components/ui';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const COMMISSION_RATE = 0.10;

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'REQUESTED', label: '⏳ Awaiting Customer' },
  { value: 'CUSTOMER_PAID', label: '💳 Ready to Release' },
  { value: 'RELEASED', label: '✅ Released' },
];

function PaymentStatusBadge({ status }) {
  const map = {
    REQUESTED:     { label: '⏳ Worker Requested', cls: 'bg-amber-100 text-amber-700' },
    CUSTOMER_PAID: { label: '💳 Customer Paid', cls: 'bg-blue-100 text-blue-700' },
    RELEASED:      { label: '✅ Released to Worker', cls: 'bg-emerald-100 text-emerald-700' },
    PENDING:       { label: '○ Pending', cls: 'bg-slate-100 text-slate-500' },
  };
  const s = map[status] || map.PENDING;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

export default function AdminPayments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('CUSTOMER_PAID');
  const [releasing, setReleasing] = useState(null);

  const loadData = () => {
    setLoading(true);
    adminAPI.getPayments({ status: tab || undefined, limit: 50 })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [tab]);

  const handleRelease = async (job) => {
    if (!confirm(`Release $${(job.agreedPrice * (1 - COMMISSION_RATE)).toFixed(2)} to ${job.assignedWorker?.firstName}? QuickFix keeps $${(job.agreedPrice * COMMISSION_RATE).toFixed(2)} commission.`)) return;
    setReleasing(job.id);
    try {
      const res = await adminAPI.releasePayment(job.id);
      toast.success(res.data.message || 'Payment released!');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to release payment');
    } finally { setReleasing(null); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="section-title">Payment Management</h1>
              <p className="text-slate-500 text-sm mt-1">Review and release payments to workers</p>
            </div>
            {data?.stats && (
              <div className="flex gap-2 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200">
                {data.stats.customerPaid} awaiting release
              </div>
            )}
          </div>

          {/* Stats */}
          {data?.stats && (
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { label: 'Pending Requests', value: data.stats.requested, color: 'text-amber-600' },
                { label: 'Customer Paid', value: data.stats.customerPaid, color: 'text-blue-600' },
                { label: 'Released', value: data.stats.released, color: 'text-emerald-600' },
              ].map(s => (
                <div key={s.label} className="card px-5 py-3">
                  <div className={`font-display font-black text-2xl ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => { setLoading(true); setTab(t.value); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${tab === t.value ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-container py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : !data?.jobs?.length ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">💸</div>
            <p className="text-slate-500">No payment requests in this category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.jobs.map(job => {
              const total = job.agreedPrice || 0;
              const commission = total * COMMISSION_RATE;
              const workerAmount = total - commission;
              const review = job.reviews?.[0];

              return (
                <div key={job.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <PaymentStatusBadge status={job.paymentStatus} />
                        <span className="text-xs text-slate-400">
                          {job.paymentRequestedAt && `Requested ${formatDistanceToNow(new Date(job.paymentRequestedAt), { addSuffix: true })}`}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900">{job.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                        <span>Worker: <strong className="text-slate-700">{job.assignedWorker?.firstName} {job.assignedWorker?.lastName}</strong></span>
                        <span>Customer: <strong className="text-slate-700">{job.customer?.firstName} {job.customer?.lastName}</strong></span>
                      </div>

                      {/* Payment breakdown */}
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-slate-400">Total</p>
                          <p className="font-display font-black text-lg text-slate-900">${total}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Commission (10%)</p>
                          <p className="font-display font-black text-lg text-brand-600">${commission.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Worker Receives</p>
                          <p className="font-display font-black text-lg text-emerald-600">${workerAmount.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Customer review */}
                      {review && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                          <p className="text-xs font-semibold text-amber-700 mb-1">Customer Feedback</p>
                          <div className="flex items-center gap-1 mb-1">
                            {[1,2,3,4,5].map(s => <span key={s} className={s <= review.rating ? 'text-amber-400' : 'text-slate-200'}>★</span>)}
                          </div>
                          <p className="text-sm text-slate-700 italic">"{review.comment}"</p>
                        </div>
                      )}

                      {/* Timeline */}
                      {job.paymentStatus === 'RELEASED' && job.releasedAt && (
                        <p className="text-xs text-slate-400 mt-2">
                          Released {format(new Date(job.releasedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                      {job.paymentStatus === 'CUSTOMER_PAID' && job.customerPaidAt && (
                        <p className="text-xs text-slate-400 mt-2">
                          Customer paid {format(new Date(job.customerPaidAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {job.paymentStatus === 'CUSTOMER_PAID' && (
                        <button
                          onClick={() => handleRelease(job)}
                          disabled={releasing === job.id}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all text-sm disabled:opacity-50"
                        >
                          {releasing === job.id ? <Spinner size="sm" /> : '🚀 Release Payment'}
                        </button>
                      )}
                      {job.paymentStatus === 'REQUESTED' && (
                        <span className="text-xs text-amber-600 font-medium text-center px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
                          Waiting for<br/>customer to pay
                        </span>
                      )}
                      {job.paymentStatus === 'RELEASED' && (
                        <span className="text-xs text-emerald-700 font-semibold text-center px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                          ✅ Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
