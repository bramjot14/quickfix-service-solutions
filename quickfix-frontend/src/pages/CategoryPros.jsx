import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { ProCard, Spinner, EmptyState } from '../components/ui';
import { track } from '../lib/api';

const CITIES = ['All', 'Toronto', 'Mississauga', 'Brampton', 'Scarborough', 'North York', 'Etobicoke', 'Vaughan', 'Markham'];
const SORT_OPTIONS = [
  { value: 'rating', label: '⭐ Top Rated' },
  { value: 'reviews', label: '💬 Most Reviews' },
  { value: 'response', label: '⚡ Fastest Response' },
  { value: 'recent', label: '🟢 Recently Active' },
];

export default function CategoryPros() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pros, setPros] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const city = searchParams.get('city') || 'All';
  const available = searchParams.get('available') || '';
  const minRating = searchParams.get('minRating') || '';
  const sort = searchParams.get('sort') || 'rating';

  useEffect(() => {
    setLoading(true);
    const params = { category };
    if (city !== 'All') params.city = city;
    if (available) params.available = available;
    if (minRating) params.minRating = minRating;
    if (sort) params.sort = sort;

    publicAPI.getPros(params)
      .then(r => { setPros(r.data.pros); setPagination(r.data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));

    track('pro_list_viewed', { category, city, sort });
  }, [category, city, available, minRating, sort]);

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    setSearchParams(p);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8">
          <nav className="text-sm text-slate-500 mb-3">
            <Link to="/services" className="hover:text-brand-600">Services</Link>
            <span className="mx-2">›</span>
            <span className="text-slate-900 font-medium">{category}</span>
          </nav>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="section-title">{category} Pros</h1>
              {pagination && (
                <p className="text-slate-500 text-sm mt-1">
                  {pagination.total} verified {category.toLowerCase()} professionals
                  {city !== 'All' ? ` in ${city}` : ' in the GTA'}
                </p>
              )}
            </div>
            <Link to={`/post/${encodeURIComponent(category)}`} className="btn-primary flex-shrink-0">
              Post a Job
            </Link>
          </div>
        </div>
      </div>

      <div className="page-container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="card p-5 space-y-5 sticky top-20">
              <h3 className="font-semibold text-slate-800 text-sm">Filters</h3>

              {/* City */}
              <div>
                <label className="label">City</label>
                <select value={city} onChange={e => setParam('city', e.target.value === 'All' ? '' : e.target.value)}
                  className="input text-sm py-2">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="label">Sort by</label>
                <select value={sort} onChange={e => setParam('sort', e.target.value)} className="input text-sm py-2">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Available now */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={available === 'true'}
                  onChange={e => setParam('available', e.target.checked ? 'true' : '')}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-700">Available now</span>
              </label>

              {/* Min rating */}
              <div>
                <label className="label">Min. Rating</label>
                <select value={minRating} onChange={e => setParam('minRating', e.target.value)} className="input text-sm py-2">
                  <option value="">Any rating</option>
                  <option value="4.5">4.5+ ⭐</option>
                  <option value="4">4.0+ ⭐</option>
                  <option value="3.5">3.5+ ⭐</option>
                </select>
              </div>

              {/* Clear */}
              {(city !== 'All' || available || minRating) && (
                <button onClick={() => setSearchParams({ sort })}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                  Clear filters ×
                </button>
              )}
            </div>
          </aside>

          {/* Pro grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : pros.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No pros found"
                description="Try adjusting your filters or check back soon"
                action={<Link to="/post" className="btn-primary text-sm">Post a job instead</Link>}
              />
            ) : (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pros.map(pro => <ProCard key={pro.userId || pro.id} pro={pro} />)}
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex justify-center mt-8 gap-2">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p}
                        onClick={() => setParam('page', p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                          ${p === pagination.page ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
