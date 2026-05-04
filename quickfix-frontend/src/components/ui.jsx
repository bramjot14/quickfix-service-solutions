import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// ─── Star Rating ──────────────────────────────────────────
export function StarRating({ rating, count, size = 'sm' }) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex">
        {stars.map(s => (
          <svg key={s} className={`${sz} ${s <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}`}
            fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </span>
      <span className="text-slate-600 text-sm font-medium">{Number(rating).toFixed(1)}</span>
      {count !== undefined && <span className="text-slate-400 text-sm">({count})</span>}
    </span>
  );
}

// ─── Verified Badge ───────────────────────────────────────
export function VerifiedBadge({ status, size = 'sm' }) {
  if (status !== 'APPROVED') return null;
  return (
    <span className="badge-verified">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Verified
    </span>
  );
}

// ─── Spinner ─────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return (
    <svg className={`${sz} animate-spin text-brand-500 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Empty State ─────────────────────────────────────────
export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ─── Response Time Badge ──────────────────────────────────
export function ResponseBadge({ minutes, isAvailable }) {
  if (isAvailable) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Available now
      </span>
    );
  }
  if (!minutes) return null;
  let label = `~${minutes}m response`;
  let color = 'text-slate-500';
  if (minutes <= 15) { label = `Responds in ${minutes}m`; color = 'text-emerald-600'; }
  else if (minutes <= 30) { label = `Responds in ${minutes}m`; color = 'text-amber-600'; }
  return <span className={`text-xs font-medium ${color}`}>⚡ {label}</span>;
}

// ─── Pro Card ─────────────────────────────────────────────
export function ProCard({ pro, showMatchScore }) {
  const profile = pro.workerProfile || pro;
  const user = pro.user || pro;
  const userId = user.id || pro.userId || pro.id;
  const lastActive = profile.lastActiveAt
    ? formatDistanceToNow(new Date(profile.lastActiveAt), { addSuffix: true })
    : null;

  return (
    <Link to={`/pros/${userId}`} className="card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block p-5">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-700 font-bold text-xl">
                {(user.firstName || '?')[0]}{(user.lastName || '')[0]}
              </span>
            )}
          </div>
          {profile.isAvailable && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                {profile.businessName || `${user.firstName} ${user.lastName}`}
              </h3>
              <p className="text-xs text-slate-500">{profile.category} · {profile.city}</p>
            </div>
            {profile.verificationStatus === 'APPROVED' && <VerifiedBadge status="APPROVED" />}
          </div>

          <div className="flex items-center gap-3 mt-2">
            {profile.avgRating > 0 && (
              <StarRating rating={profile.avgRating} count={profile.reviewsCount} />
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <ResponseBadge minutes={profile.responseMinutes} isAvailable={profile.isAvailable} />
            {profile.hourlyRateMin && (
              <span className="text-xs text-slate-500">
                ${profile.hourlyRateMin}–${profile.hourlyRateMax}/hr
              </span>
            )}
          </div>

          {showMatchScore && pro.matchScore && (
            <div className="mt-2 flex items-center gap-1">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, pro.matchScore)}%` }} />
              </div>
              <span className="text-xs font-semibold text-brand-600">{pro.matchScore}% match</span>
            </div>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="text-xs text-slate-500 mt-3 line-clamp-2">{profile.bio}</p>
      )}
    </Link>
  );
}

// ─── Job Status Badge ────────────────────────────────────
export function JobStatusBadge({ status }) {
  const map = {
    OPEN: { label: 'Open', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    ASSIGNED: { label: 'Assigned', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    IN_PROGRESS: { label: 'In Progress', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Page Header ─────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="section-title">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Alert ───────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  return (
    <div className={`flex gap-2 p-4 rounded-xl border ${styles[type]} text-sm`}>
      <span>{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}
