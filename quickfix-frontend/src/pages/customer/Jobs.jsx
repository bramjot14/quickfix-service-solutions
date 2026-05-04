import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI } from '../../lib/api';
import { JobStatusBadge, EmptyState, Spinner } from '../../components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function CustomerJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    jobsAPI.getMyJobs(filter ? { status: filter } : {})
      .then(r => setJobs(r.data))
      .finally(() => setLoading(false));
  }, [filter]);

  const counts = jobs.reduce((acc, j) => ({ ...acc, [j.status]: (acc[j.status] || 0) + 1 }), {});

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="section-title">My Jobs</h1>
              <p className="text-slate-500 text-sm mt-0.5">{jobs.length} total jobs</p>
            </div>
            <Link to="/post" className="btn-primary">+ Post New Job</Link>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-1">
            {[
              { value: '', label: 'All' },
              { value: 'OPEN', label: 'Open' },
              { value: 'ASSIGNED', label: 'Assigned' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ].map(f => (
              <button key={f.value} onClick={() => { setLoading(true); setFilter(f.value); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${filter === f.value ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {f.label}
                {f.value && counts[f.value] ? <span className="ml-1 text-xs opacity-70">({counts[f.value]})</span> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-container py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No jobs yet"
            description="Post your first job and get bids from verified pros"
            action={<Link to="/post" className="btn-primary">Post a Free Job</Link>}
          />
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <Link key={job.id} to={`/customer/jobs/${job.id}`}
                className="card p-5 block hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <JobStatusBadge status={job.status} />
                      {job.isEmergency && (
                        <span className="badge-emergency">🚨 Emergency</span>
                      )}
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {job.category} · {job.locationCity}
                      {job.budgetMin && ` · $${job.budgetMin}–$${job.budgetMax}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {job._count?.bids > 0 && (
                      <div className="text-center">
                        <div className="font-display font-bold text-brand-600 text-lg">{job._count.bids}</div>
                        <div className="text-xs text-slate-400">bid{job._count.bids !== 1 ? 's' : ''}</div>
                      </div>
                    )}
                    {job.assignedWorker && (
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                        {job.assignedWorker.firstName?.[0]}{job.assignedWorker.lastName?.[0]}
                      </div>
                    )}
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
