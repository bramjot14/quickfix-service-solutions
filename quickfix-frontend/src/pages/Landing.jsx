import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { StarRating } from '../components/ui';
import { track } from '../lib/api';

const HERO_STATS = [
  { value: '2,400+', label: 'Verified Pros' },
  { value: '18,000+', label: 'Jobs Completed' },
  { value: '4.8★', label: 'Average Rating' },
  { value: '<15min', label: 'Avg. Response' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: '📋', title: 'Describe your job', desc: 'Tell us what you need — takes under 2 minutes. Add photos for better quotes.' },
  { step: '02', icon: '⚡', title: 'Get instant matches', desc: 'Our algorithm surfaces the top 3 verified pros for your category and location.' },
  { step: '03', icon: '💬', title: 'Receive live bids', desc: 'Pros send real-time bids with price, ETA, and a message. Compare and choose.' },
  { step: '04', icon: '✅', title: 'Get it done', desc: 'Chat with your pro, track progress, pay when done, and leave a verified review.' },
];

const TRUST_ITEMS = [
  { icon: '🛡️', title: 'ID + Certificate Verified', desc: 'Every pro submits government ID and trade certificate before appearing on QuickFix.' },
  { icon: '⭐', title: 'Real Job Reviews', desc: 'Reviews are only accepted after a job is completed through our platform — no fake ratings.' },
  { icon: '💬', title: 'Locked Chat', desc: 'Direct communication only unlocks after you assign a worker — no unsolicited contact.' },
  { icon: '💰', title: 'Pay When Done', desc: "You hold payment until the job is complete. Workers request payment, you confirm." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Toronto');

  useEffect(() => {
    publicAPI.getCategories().then(r => setCategories(r.data.slice(0, 12))).catch(() => {});
    track('landing_page_view');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    track('landing_cta_click', { query: searchQuery });
    if (searchQuery) {
      navigate(`/services?q=${encodeURIComponent(searchQuery)}&city=${selectedCity}`);
    } else {
      navigate('/services');
    }
  };

  const handleCategoryClick = (cat) => {
    track('category_selected', { category: cat.name });
    navigate(`/services/${encodeURIComponent(cat.name)}`);
  };

  return (
    <div className="min-h-screen">
      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative bg-slate-900 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #f97316 0, #f97316 1px, transparent 0, transparent 50%)',
            backgroundSize: '24px 24px'
          }} />
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-600/10 to-transparent" />

        <div className="page-container relative py-20 md:py-28">
          <div className="max-w-2xl">
            {/* Emergency badge */}
            <Link to="/post?emergency=true"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-xs font-semibold mb-6 hover:bg-red-500/30 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Emergency? Get a pro in 60 minutes →
            </Link>

            <h1 className="font-display text-4xl md:text-6xl font-black text-white leading-tight mb-4">
              Find Trusted<br />
              <span className="text-brand-400">Local Pros</span><br />
              Instantly.
            </h1>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              Post your job, get real-time bids from verified pros, and hire with confidence.
              No guesswork. No fake reviews.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="What do you need? (e.g. plumber, electrician)"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 font-body text-sm"
                />
              </div>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="px-4 py-4 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 font-body text-sm border-0 min-w-0 sm:w-40"
              >
                {['Toronto', 'Mississauga', 'Brampton', 'Scarborough', 'North York', 'Etobicoke', 'Vaughan', 'Markham'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary py-4 px-6 whitespace-nowrap">
                Find Pros →
              </button>
            </form>

            <div className="flex items-center gap-4 mt-4">
              <Link to="/post" className="text-sm text-brand-400 hover:text-brand-300 font-medium">
                📋 Post a free job
              </Link>
              <span className="text-slate-700">·</span>
              <Link to="/register?role=WORKER" className="text-sm text-slate-400 hover:text-slate-300">
                Are you a pro? Join free →
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-slate-800">
          <div className="page-container py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {HERO_STATS.map(s => (
                <div key={s.label} className="text-center">
                  <div className="font-display text-2xl font-black text-brand-400">{s.value}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ──────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="page-container">
          <div className="text-center mb-10">
            <h2 className="section-title mb-2">Browse by Service</h2>
            <p className="text-slate-500">Verified pros for every home need</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 
                           hover:border-brand-200 hover:bg-brand-50 transition-all duration-200 group text-center"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{cat.icon}</span>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-brand-700 leading-tight">{cat.name}</span>
              </button>
            ))}
            <Link to="/services"
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-dashed border-slate-200 
                         hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 text-center">
              <span className="text-2xl">➕</span>
              <span className="text-xs font-semibold text-slate-500">View All</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <section className="py-16 bg-slate-50">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="section-title mb-2">How QuickFix Works</h2>
            <p className="text-slate-500">From job post to done — faster than any competitor</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-slate-200 z-0" style={{ width: 'calc(100% - 2rem)', left: 'calc(50% + 1.5rem)' }} />
                )}
                <div className="card p-6 relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500 text-white text-xl mb-4">
                    {step.icon}
                  </div>
                  <div className="text-xs font-black text-brand-400 mb-1 font-display">STEP {step.step}</div>
                  <h3 className="font-display font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ─────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="page-container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-black text-brand-500 tracking-widest uppercase mb-3 block">Trust First</span>
              <h2 className="section-title mb-4">The most trusted platform for home services</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Every QuickFix pro passes our verification process before they can bid on a single job. No shortcuts.
              </p>
              <div className="space-y-4">
                {TRUST_ITEMS.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-slate-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {/* Sample review cards */}
              {[
                { name: 'Sarah M.', rating: 5, text: 'Marcus fixed our burst pipe within 45 minutes of posting. Incredibly fast and professional!', service: 'Plumbing · Toronto', time: '2 days ago' },
                { name: 'James K.', rating: 5, text: 'Aisha installed our EV charger perfectly. Very knowledgeable and left zero mess.', service: 'Electrical · North York', time: '1 week ago' },
                { name: 'Priya L.', rating: 5, text: 'Got 4 bids within 20 minutes. Hired the top-rated worker and couldn\'t be happier.', service: 'HVAC · Mississauga', time: '3 days ago' },
              ].map((r, i) => (
                <div key={i} className="card p-5 animate-enter" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold text-slate-900 text-sm">{r.name}</span>
                      <p className="text-xs text-slate-400">{r.service}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <StarRating rating={r.rating} />
                      <span className="text-xs text-slate-400 ml-1">{r.time}</span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">"{r.text}"</p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified job review
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="py-20 bg-slate-900">
        <div className="page-container text-center">
          <h2 className="font-display text-4xl font-black text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Post your job for free. Get bids from verified pros in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/post" className="btn-primary py-4 px-8 text-base">
              Post a Job — It's Free →
            </Link>
            <Link to="/services" className="btn-secondary py-4 px-8 text-base">
              Browse Pros
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
