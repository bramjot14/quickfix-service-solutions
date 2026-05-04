import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { Spinner, Alert } from '../../components/ui';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: '⏳ Pending' },
  { value: 'APPROVED', label: '✓ Approved' },
  { value: 'REJECTED', label: '✗ Rejected' },
  { value: 'UNVERIFIED', label: '○ Unverified' },
];

function DocItem({ doc }) {
  const isPdf = doc.mimeType === 'application/pdf';
  const viewUrl = doc.signedUrl || doc.url;
  const docLabel =
    doc.docType === 'GOVERNMENT_ID' ? '🪪 Government ID'
    : doc.docType === 'CERTIFICATE' ? '📜 Trade Certificate'
    : doc.docType === 'INSURANCE' ? '🛡️ Insurance'
    : doc.docType;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div>
          <span className="text-sm font-semibold text-slate-800">{docLabel}</span>
          <p className="text-xs text-slate-500 mt-0.5">{doc.fileName}</p>
          <p className="text-xs text-slate-400">
            {format(new Date(doc.uploadedAt), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        {viewUrl && (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={isPdf ? doc.fileName : undefined}
            className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0"
          >
            {isPdf ? '⬇ Download' : '👁 View'}
          </a>
        )}
      </div>
      {!isPdf && viewUrl && (
        <div className="border-t border-slate-200 bg-slate-100">
          <img
            src={viewUrl}
            alt={doc.fileName}
            className="max-h-48 w-full object-contain"
            onError={e => { e.target.parentElement.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}

function WorkerModal({ worker, onClose, onAction }) {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(null);

  useEffect(() => {
    adminAPI.getWorkerDocuments(worker.user.id)
      .then(r => setDocs(r.data))
      .finally(() => setLoading(false));
  }, [worker.user.id]);

  const handleAction = async (status) => {
    setActing(status);
    try {
      await adminAPI.updateVerification(worker.user.id, { status, notes });
      toast.success('Worker ' + status.toLowerCase());
      onAction();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const hasId = docs?.documents?.some(d => d.docType === 'GOVERNMENT_ID');
  const hasCert = docs?.documents?.some(d => d.docType === 'CERTIFICATE');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-bold text-xl">
                {worker.user.firstName} {worker.user.lastName}
              </h2>
              <p className="text-slate-500 text-sm">{worker.user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={[
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  worker.verificationStatus === 'PENDING' ? 'bg-amber-100 text-amber-700'
                    : worker.verificationStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                ].join(' ')}>
                  {worker.verificationStatus}
                </span>
                <span className="text-xs text-slate-400">{worker.category} · {worker.city}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none ml-4"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 text-sm">Uploaded Documents</h3>
            {loading ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : !docs?.documents?.length ? (
              <Alert type="warning">No documents uploaded yet</Alert>
            ) : (
              <div className="space-y-3">
                {docs.documents.map(doc => (
                  <DocItem key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-slate-500 mb-2">Required Documents</p>
            {[
              { label: 'Government ID', has: hasId },
              { label: 'Trade Certificate', has: hasCert },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                <span className={c.has ? 'text-emerald-500' : 'text-red-400'}>
                  {c.has ? '✓' : '✗'}
                </span>
                <span className={c.has ? 'text-emerald-700' : 'text-red-600'}>{c.label}</span>
              </div>
            ))}
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Reason for rejection, or notes for approval..."
              className="input resize-none text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAction('APPROVED')}
              disabled={acting !== null}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {acting === 'APPROVED' ? <Spinner size="sm" /> : '✓ Approve'}
            </button>
            <button
              onClick={() => handleAction('REJECTED')}
              disabled={acting !== null}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {acting === 'REJECTED' ? <Spinner size="sm" /> : '✗ Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminVerifications() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING');
  const [selectedWorker, setSelectedWorker] = useState(null);

  const loadData = () => {
    setLoading(true);
    adminAPI.getVerifications({ status: tab || undefined, limit: 50 })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [tab]);

  return (
    <div className="min-h-screen bg-slate-50">
      {selectedWorker && (
        <WorkerModal
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
          onAction={loadData}
        />
      )}

      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8">
          <h1 className="section-title mb-4">Verification Management</h1>

          {data?.stats && (
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { label: 'Pending', value: data.stats.pending, color: 'text-amber-600' },
                { label: 'Approved', value: data.stats.approved, color: 'text-emerald-600' },
                { label: 'Rejected', value: data.stats.rejected, color: 'text-red-600' },
                { label: 'Unverified', value: data.stats.unverified, color: 'text-slate-500' },
              ].map(s => (
                <div key={s.label} className="card px-5 py-3">
                  <div className={['font-display font-black text-2xl', s.color].join(' ')}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUS_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => { setLoading(true); setTab(t.value); }}
                className={[
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  tab === t.value ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-container py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : !data?.profiles?.length ? (
          <div className="text-center py-20 text-slate-500">No workers in this category</div>
        ) : (
          <div className="space-y-3">
            {data.profiles.map(worker => (
              <div key={worker.id} className="card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">
                      {worker.user.firstName[0]}{worker.user.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">
                          {worker.user.firstName} {worker.user.lastName}
                        </h3>
                        <span className={[
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          worker.verificationStatus === 'PENDING' ? 'bg-amber-100 text-amber-700'
                            : worker.verificationStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700'
                            : worker.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-500'
                        ].join(' ')}>
                          {worker.verificationStatus}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{worker.user.email}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
                        <span>{worker.category}</span>
                        <span>·</span>
                        <span>{worker.city}</span>
                        <span>·</span>
                        <span>{worker.documents?.length || 0} doc(s)</span>
                        {worker.requestedAt && (
                          <>
                            <span>·</span>
                            <span>Requested {formatDistanceToNow(new Date(worker.requestedAt), { addSuffix: true })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden md:flex gap-1">
                      {['GOVERNMENT_ID', 'CERTIFICATE'].map(dt => {
                        const has = worker.documents?.some(d => d.docType === dt);
                        return (
                          <span
                            key={dt}
                            className={[
                              'text-xs px-2 py-0.5 rounded font-medium',
                              has ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                            ].join(' ')}
                          >
                            {dt === 'GOVERNMENT_ID' ? 'ID' : 'Cert'}
                          </span>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setSelectedWorker(worker)}
                      className="btn-primary text-sm py-2"
                    >
                      Review →
                    </button>
                  </div>
                </div>

                {worker.verificationNotes && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <strong>Notes:</strong> {worker.verificationNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
