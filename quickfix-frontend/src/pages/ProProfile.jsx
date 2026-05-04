import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { StarRating, VerifiedBadge, ResponseBadge, Spinner, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function ProProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pro, setPro] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicAPI.getPro(id)
      .then(r => setPro(r.data))
      .catch(() => navigate('/services'))
      .finally(() => setLoading(false));
    track('pro_profile_view', { proId: id });
  }, [id]);

  if (loading) return <div className="page-container py-20 flex justify-center"><Spinner size="lg" /></div>;
  if (!pro) return null;

  const { user: proUser, reviews, badges } = pro;
  const minsAgo = pro.lastActiveAt
    ? Math.floor((Date.now() - new Date(pro.lastActiveAt)) / 60000)
    : null;

  const handleHire = () => {
    navigate(`/post/${encodeURIComponent(pro.category)}/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8">
          <nav className="text-sm text-slate-500 mb-4">
            <Link to="/services" className="hover:text-brand-600">Services</Link>
            <span className="mx-2">›</span>
            <Link to={`/services/${encodeURIComponent(pro.category)}`} className="hover:text-brand-600">{pro.category}</Link>
            <span className="mx-2">›</span>
            <span className="text-slate-900">{proUser?.firstName} {proUser?.lastName}</span>
          </nav>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center overflow-hidden">
                {proUser?.avatarUrl ? (
                  <img src={proUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-brand-700 font-black text-3xl">
                    {proUser?.firstName?.[0]}{proUser?.lastName?.[0]}
                  </span>
                )}
              </div>
              {pro.isAvailable && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-3 mb-2">
                <h1 className="font-display text-2xl font-bold text-slate-900">
                  {pro.businessName || `${proUser?.firstName} ${proUser?.lastName}`}
                </h1>
                <VerifiedBadge status={pro.verificationStatus} />
                {pro.isAvailable && (
                  <span className="badge-verified bg-emerald-50 text-emerald-700 border-emerald-200">
                    🟢 Available Now
                  </span>
                )}
              </div>

              <p className="text-slate-500 text-sm mb-3">
                {pro.category} · {pro.city}, ON
                {minsAgo !== null && (
                  <span className="ml-2">
                    · Last active {minsAgo < 5 ? 'just now' : `${minsAgo}m ago`}
                  </span>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-3">
                {pro.avgRating > 0 && <StarRating rating={pro.avgRating} count={pro.reviewsCount} size="lg" />}
                <ResponseBadge minutes={pro.responseMinutes} isAvailable={pro.isAvailable} />
                {pro.jobsCompleted > 0 && (
                  <span className="text-sm text-slate-500">🔧 {pro.jobsCompleted} jobs done</span>
                )}
              </div>

              {/* Badges */}
              {badges?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {badges.map(b => (
                    <span key={b.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="card p-5 w-full md:w-72 flex-shrink-0">
              {pro.hourlyRateMin && (
                <div className="text-center mb-4">
                  <span className="font-display text-3xl font-black text-slate-900">
                    ${pro.hourlyRateMin}–${pro.hourlyRateMax}
                  </span>
                  <span className="text-slate-500 text-sm">/hr</span>
                </div>
              )}
              <button onClick={handleHire} className="btn-primary w-full mb-2">
                Request a Quote
              </button>
              <Link to={`/post?preferred=${id}`} className="btn-secondary w-full text-sm">
                Post a Job
              </Link>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Verification</span>
                  <span className="text-emerald-600 font-semibold">✓ ID + Certificate</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Response time</span>
                  <span className="font-medium text-slate-700">~{pro.responseMinutes} min</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Location</span>
                  <span className="font-medium text-slate-700">{pro.city}, ON</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {/* Bio */}
            {pro.bio && (
              <div className="card p-6">
                <h2 className="font-display font-bold text-lg mb-3">About</h2>
                <p className="text-slate-600 leading-relaxed">{pro.bio}</p>
              </div>
            )}

            {/* Skills */}
            {pro.skills?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-display font-bold text-lg mb-3">Services Offered</h2>
                <div className="flex flex-wrap gap-2">
                  {pro.skills.map(s => (
                    <span key={s} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">
                  Reviews ({pro.reviewsCount})
                </h2>
                {pro.avgRating > 0 && <StarRating rating={pro.avgRating} size="lg" />}
              </div>

              {!reviews?.length ? (
                <EmptyState icon="💬" title="No reviews yet" description="Be the first to review this pro after your job" />
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="pb-4 border-b border-slate-100 last:border-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                            {r.reviewer?.firstName?.[0]}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-900">
                              {r.reviewer?.firstName} {r.reviewer?.lastName?.[0]}.
                            </span>
                            {r.job && <p className="text-xs text-slate-400">{r.job.title}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={r.rating} />
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed ml-10">{r.comment}</p>
                      {r.isVerifiedJob && (
                        <span className="ml-10 inline-flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                          ✓ Verified job review
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar stats */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-display font-bold text-base mb-4">Stats</h3>
              <div className="space-y-3">
                {[
                  { label: 'Jobs Completed', value: pro.jobsCompleted || 0, icon: '🔧' },
                  { label: 'Reviews', value: pro.reviewsCount, icon: '⭐' },
                  { label: 'Avg Response', value: `${pro.responseMinutes}m`, icon: '⚡' },
                  { label: 'Member Since', value: proUser?.createdAt ? new Date(proUser.createdAt).getFullYear() : '—', icon: '📅' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{s.icon} {s.label}</span>
                    <span className="font-semibold text-slate-900 text-sm">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust */}
            <div className="card p-5">
              <h3 className="font-display font-bold text-base mb-3">Verification</h3>
              <div className="space-y-2">
                {[
                  { label: 'Government ID', checked: true },
                  { label: 'Trade Certificate', checked: true },
                  { label: 'Verified Pro Status', checked: pro.verificationStatus === 'APPROVED' },
                ].map(v => (
                  <div key={v.label} className="flex items-center gap-2 text-sm">
                    <span className={v.checked ? 'text-emerald-500' : 'text-slate-300'}>
                      {v.checked ? '✓' : '○'}
                    </span>
                    <span className={v.checked ? 'text-slate-700' : 'text-slate-400'}>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
