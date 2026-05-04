import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { jobsAPI, matchAPI, publicAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { StarRating, Spinner, Alert, ProCard } from '../components/ui';
import toast from 'react-hot-toast';
import { track } from '../lib/api';
import { useDropzone } from 'react-dropzone';

const CITIES = ['Toronto', 'Mississauga', 'Brampton', 'Scarborough', 'North York', 'Etobicoke', 'Vaughan', 'Markham', 'Richmond Hill', 'Oakville'];

export default function PostJob() {
  const { category: urlCategory, proId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1); // 1=details, 2=location+budget, 3=done
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [topWorkers, setTopWorkers] = useState([]);
  const [createdJob, setCreatedJob] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreview, setMediaPreview] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: urlCategory || '',
    locationCity: 'Toronto',
    locationAddress: '',
    budgetMin: '',
    budgetMax: '',
    isEmergency: searchParams.get('emergency') === 'true',
    preferredWorkerId: proId || searchParams.get('preferred') || '',
  });

  useEffect(() => {
    publicAPI.getCategories().then(r => setCategories(r.data)).catch(() => {});
    track('job_post_started', { category: urlCategory });
  }, []);

  // Fetch pricing benchmark when category+city changes
  useEffect(() => {
    if (form.category && form.locationCity) {
      matchAPI.getPricingBenchmark({ category: form.category, city: form.locationCity })
        .then(r => setBenchmark(r.data))
        .catch(() => setBenchmark(null));
    }
  }, [form.category, form.locationCity]);

  const onDrop = useCallback((acceptedFiles) => {
    setMediaFiles(prev => [...prev, ...acceptedFiles].slice(0, 5));
    const previews = acceptedFiles.map(f => ({
      url: URL.createObjectURL(f),
      name: f.name,
      type: f.type
    }));
    setMediaPreview(prev => [...prev, ...previews].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 5,
    maxSize: 20 * 1024 * 1024
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const applyBenchmark = () => {
    if (benchmark) {
      set('budgetMin', String(Math.round(benchmark.minPrice)));
      set('budgetMax', String(Math.round(benchmark.maxPrice)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      mediaFiles.forEach(f => fd.append('media', f));

      const { data } = await jobsAPI.createJob(fd);
      setCreatedJob(data.job);
      setTopWorkers(data.topWorkers || []);
      setStep(3);
      track('job_post_submitted', { jobId: data.job.id, category: form.category });
      if (data.topWorkers?.length) track('top3_shown', { jobId: data.job.id });
      toast.success('Job posted! Watch for bids.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect if not customer
  if (user && user.role !== 'CUSTOMER') {
    return (
      <div className="page-container py-20 text-center">
        <p className="text-slate-500">Only customers can post jobs.</p>
      </div>
    );
  }

  if (step === 3 && createdJob) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="page-container py-12 max-w-2xl mx-auto">
          <div className="card p-8 text-center mb-6">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">Job Posted!</h1>
            <p className="text-slate-500 mb-4">Your job is live. Verified pros will start bidding shortly.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate(`/customer/jobs/${createdJob.id}`)}
                className="btn-primary">
                View Live Bids →
              </button>
              <button onClick={() => navigate('/customer/jobs')} className="btn-secondary">My Jobs</button>
            </div>
          </div>

          {topWorkers.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900 mb-4">
                ⚡ Top 3 Matched Pros for Your Job
              </h2>
              <div className="space-y-3">
                {topWorkers.map((w, i) => (
                  <div key={w.id} className="relative">
                    {i === 0 && (
                      <span className="absolute -top-2 -left-2 z-10 bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Best Match
                      </span>
                    )}
                    <ProCard pro={w} showMatchScore />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center mt-3">
                These pros match your category, location, and availability. You'll see their bids in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8 max-w-2xl mx-auto">
          <h1 className="section-title mb-1">Post a Job</h1>
          <p className="text-slate-500">Get bids from verified pros in minutes — free to post</p>
          {/* Progress */}
          <div className="flex gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-brand-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="page-container py-8 max-w-2xl mx-auto">
        {form.isEmergency && (
          <Alert type="error">
            <strong>Emergency Mode</strong> — Your job will be flagged as urgent. Higher-priority matching applies. Emergency pricing may be higher.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {step === 1 && (
            <div className="card p-6 space-y-5 animate-enter">
              <h2 className="font-display font-bold text-lg">Job Details</h2>

              {/* Category */}
              <div>
                <label className="label">Service Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="input" required>
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="label">Job Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Fix leaking kitchen tap, Install pot lights in living room"
                  className="input" required maxLength={200} />
              </div>

              {/* Description */}
              <div>
                <label className="label">Describe the Work *</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={4} placeholder="Describe what needs to be done in detail. The more you share, the more accurate the quotes."
                  className="input resize-none" required maxLength={2000} />
                <p className="text-xs text-slate-400 mt-1">{form.description.length}/2000</p>
              </div>

              {/* Media upload */}
              <div>
                <label className="label">Photos / Video <span className="text-slate-400 font-normal">(optional, but gets better quotes)</span></label>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}>
                  <input {...getInputProps()} />
                  <p className="text-slate-500 text-sm">
                    {isDragActive ? 'Drop files here...' : '📸 Drag & drop photos or video here, or click to select'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">JPEG, PNG, MP4 — max 5 files, 20MB each</p>
                </div>
                {mediaPreview.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {mediaPreview.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                        {p.type.startsWith('image') ? (
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs text-white">📹</div>
                        )}
                        <button type="button"
                          onClick={() => { setMediaFiles(f => f.filter((_, j) => j !== i)); setMediaPreview(p => p.filter((_, j) => j !== i)); }}
                          className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-bl text-xs flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Emergency toggle */}
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors">
                <input type="checkbox" checked={form.isEmergency} onChange={e => set('isEmergency', e.target.checked)}
                  className="w-4 h-4 accent-red-500" />
                <div>
                  <span className="font-semibold text-slate-900 text-sm">🚨 Emergency — Need help ASAP</span>
                  <p className="text-xs text-slate-500">Only available-now workers will be matched. Emergency pricing may apply.</p>
                </div>
              </label>

              <button type="button" onClick={() => setStep(2)} className="btn-primary w-full"
                disabled={!form.category || !form.title || !form.description}>
                Next: Location & Budget →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="card p-6 space-y-5 animate-enter">
              <h2 className="font-display font-bold text-lg">Location & Budget</h2>

              <div>
                <label className="label">City *</label>
                <select value={form.locationCity} onChange={e => set('locationCity', e.target.value)} className="input">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Address <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={form.locationAddress} onChange={e => set('locationAddress', e.target.value)}
                  placeholder="Street address (helps pros estimate travel time)"
                  className="input" />
              </div>

              {/* Pricing benchmark */}
              {benchmark && (
                <div className="p-4 bg-brand-50 rounded-xl border border-brand-200">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-brand-900">💰 Typical cost in {form.locationCity}</p>
                      <p className="text-2xl font-display font-black text-brand-700 mt-1">
                        ${Math.round(benchmark.minPrice)} – ${Math.round(benchmark.maxPrice)}
                      </p>
                      <p className="text-xs text-brand-600">Median: ${Math.round(benchmark.medianPrice)} · Based on {benchmark.sampleSize} jobs</p>
                      {benchmark.isEstimate && <p className="text-xs text-brand-500 mt-0.5">{benchmark.message}</p>}
                    </div>
                    <button type="button" onClick={applyBenchmark}
                      className="text-xs font-semibold text-brand-700 bg-brand-100 hover:bg-brand-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                      Use range
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Budget Min ($)</label>
                  <input type="number" value={form.budgetMin} onChange={e => set('budgetMin', e.target.value)}
                    placeholder="0" min="0" className="input" />
                </div>
                <div>
                  <label className="label">Budget Max ($)</label>
                  <input type="number" value={form.budgetMax} onChange={e => set('budgetMax', e.target.value)}
                    placeholder="No limit" min="0" className="input" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                  ← Back
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting || !form.locationCity}>
                  {submitting ? <><Spinner size="sm" /> Posting...</> : '🚀 Post Job — Free'}
                </button>
              </div>

              {!user && (
                <p className="text-xs text-center text-slate-500">
                  You'll need to <Link to="/login" className="text-brand-600 font-medium">sign in</Link> or{' '}
                  <Link to="/register" className="text-brand-600 font-medium">register</Link> to post
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
