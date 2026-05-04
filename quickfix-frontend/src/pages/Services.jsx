import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { Spinner } from '../components/ui';
import { track } from '../lib/api';

export default function Services() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get('q') || '';

  useEffect(() => {
    publicAPI.getCategories()
      .then(r => setCategories(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = q
    ? categories.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
    : categories;

  const handleClick = (cat) => {
    track('category_selected', { category: cat.name });
    navigate(`/services/${encodeURIComponent(cat.name)}`);
  };

  if (loading) return (
    <div className="page-container py-20 flex justify-center">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-10">
          <h1 className="section-title mb-2">All Services</h1>
          <p className="text-slate-500">Choose a category to find verified pros near you</p>
        </div>
      </div>

      <div className="page-container py-10">
        {q && (
          <p className="text-sm text-slate-500 mb-6">
            Showing results for "<strong>{q}</strong>" — {filtered.length} categories
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleClick(cat)}
              className="card p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200 
                         group text-center cursor-pointer hover:border-brand-200"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                {cat.icon}
              </div>
              <h3 className="font-display font-bold text-slate-900 text-sm mb-1">{cat.name}</h3>
              <p className="text-xs text-slate-400 leading-tight">{cat.description}</p>
            </button>
          ))}
        </div>

        {/* Post job CTA */}
        <div className="mt-12 bg-gradient-to-r from-brand-500 to-brand-600 rounded-3xl p-8 text-white text-center">
          <h2 className="font-display text-2xl font-bold mb-2">Don't see what you need?</h2>
          <p className="text-brand-100 mb-4">Post a job and let pros come to you</p>
          <Link to="/post" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-600 font-bold rounded-xl hover:bg-brand-50 transition-colors">
            Post a Free Job →
          </Link>
        </div>
      </div>
    </div>
  );
}
