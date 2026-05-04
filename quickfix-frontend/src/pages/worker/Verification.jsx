import { useState, useEffect, useCallback } from 'react';
import { workerAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Alert, Spinner } from '../../components/ui';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { formatDistanceToNow } from 'date-fns';
import api from '../../lib/api';

const DOC_TYPES = [
  { value: 'GOVERNMENT_ID', label: 'Government ID', icon: '🪪', desc: "Passport, Driver's License, or Provincial ID", required: true },
  { value: 'CERTIFICATE', label: 'Trade Certificate', icon: '📜', desc: 'License, certification, or diploma for your trade', required: true },
  { value: 'INSURANCE', label: 'Insurance Certificate', icon: '🛡️', desc: 'Liability insurance documentation', required: false },
];

// ── Profile Photo Uploader ────────────────────────────────
function ProfilePhotoUploader({ currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);

  const onDrop = useCallback(async (files) => {
    if (!files[0]) return;
    if (!confirmed) {
      toast.error('Please confirm your photo was taken within the last 6 months first');
      return;
    }
    setUploading(true);
    const objectUrl = URL.createObjectURL(files[0]);
    setPreview(objectUrl);
    try {
      const fd = new FormData();
      fd.append('photo', files[0]);
      fd.append('confirmedRecent', 'true');
      await api.post('/workers/me/profile-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Profile photo uploaded!');
      onUploaded();
    } catch (err) {
      setPreview(currentUrl || null);
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [confirmed, currentUrl, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">📸</span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Profile Photo</h3>
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Required</span>
          </div>
          <p className="text-xs text-slate-500">A clear, recent photo of your face — must be taken within the last 6 months</p>
        </div>
        {currentUrl && <span className="badge-verified ml-auto flex-shrink-0">✓ Uploaded</span>}
      </div>

      {/* Preview */}
      <div className="flex gap-4 items-start mb-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 flex-shrink-0">
          {preview ? (
            <img src={preview} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-1">No photo</div>
          )}
        </div>
        <div className="flex-1">
          {/* Confirmation checkbox — must check before upload */}
          <label className={`flex items-start gap-2 cursor-pointer p-3 rounded-xl border transition-colors mb-3
            ${confirmed ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-brand-500 flex-shrink-0" />
            <span className="text-xs text-slate-700 leading-relaxed">
              I confirm this photo was taken <strong>within the last 6 months</strong> and clearly shows my face
            </span>
          </label>

          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}
            ${!confirmed ? 'opacity-40 cursor-not-allowed' : ''}
            ${uploading ? 'opacity-60' : ''}`}>
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" /> Uploading...
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {currentUrl ? '🔄 Replace photo' : '📤 Upload photo'} — JPEG, PNG, WebP (max 5MB)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Document Uploader ─────────────────────────────────────
function DocUploader({ docType, existingDoc, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (files) => {
    if (!files[0]) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', files[0]);
      fd.append('docType', docType.value);
      await workerAPI.uploadDocument(fd);
      toast.success(`${docType.label} uploaded`);
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [docType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{docType.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{docType.label}</h3>
              {docType.required && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Required</span>
              )}
            </div>
            <p className="text-xs text-slate-500">{docType.desc}</p>
          </div>
        </div>
        {existingDoc ? (
          <span className="badge-verified">✓ Uploaded</span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Not uploaded</span>
        )}
      </div>

      {existingDoc && (
        <div className="mb-3 p-2 bg-emerald-50 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
          <span>📎</span>
          <span className="truncate flex-1">{existingDoc.fileName}</span>
          <span>{formatDistanceToNow(new Date(existingDoc.uploadedAt), { addSuffix: true })}</span>
        </div>
      )}

      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}
        ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Spinner size="sm" /> Uploading...
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {existingDoc ? '🔄 Replace document' : '📤 Upload document'}
            <span className="block text-xs text-slate-400 mt-0.5">PDF, JPEG, or PNG — max 10MB</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Verification Page ────────────────────────────────
export default function WorkerVerification() {
  const { user, refreshUser } = useAuth();
  const [verification, setVerification] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: '', businessName: '', category: '', city: 'Toronto',
    skills: '', hourlyRateMin: '', hourlyRateMax: '', responseMinutes: 30,
  });

  const loadData = async () => {
    try {
      const { authAPI } = await import('../../lib/api');
      const [authRes, verRes] = await Promise.all([
        authAPI.me(),
        workerAPI.getVerification(),
      ]);
      setProfile(authRes.data.workerProfile);
      setVerification(verRes.data);
      if (authRes.data.workerProfile) {
        const wp = authRes.data.workerProfile;
        setProfileForm({
          bio: wp.bio || '',
          businessName: wp.businessName || '',
          category: wp.category || '',
          city: wp.city || 'Toronto',
          skills: (wp.skills || []).join(', '),
          hourlyRateMin: wp.hourlyRateMin || '',
          hourlyRateMax: wp.hourlyRateMax || '',
          responseMinutes: wp.responseMinutes || 30,
        });
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const skills = profileForm.skills.split(',').map(s => s.trim()).filter(Boolean);
      await workerAPI.updateProfile({ ...profileForm, skills });
      toast.success('Profile saved!');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSavingProfile(false); }
  };

  const handleRequestVerification = async () => {
    setRequesting(true);
    try {
      await workerAPI.requestVerification();
      toast.success('Verification request submitted! Admin will review within 24–48 hours.');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setRequesting(false); }
  };

  if (loading) return <div className="page-container py-20 flex justify-center"><Spinner size="lg" /></div>;

  const status = verification?.status || 'UNVERIFIED';
  const hasPhoto = !!profile?.profilePhotoUrl;
  const hasId = verification?.documents?.some(d => d.docType === 'GOVERNMENT_ID');
  const hasCert = verification?.documents?.some(d => d.docType === 'CERTIFICATE');
  const hasRequired = hasPhoto && hasId && hasCert;

  const statusConfig = {
    UNVERIFIED: { label: 'Not Verified', color: 'text-slate-500', bg: 'bg-slate-100', icon: '○' },
    PENDING:    { label: 'Under Review', color: 'text-amber-700', bg: 'bg-amber-100', icon: '⏳' },
    APPROVED:   { label: 'Verified Pro ✓', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: '✓' },
    REJECTED:   { label: 'Not Approved', color: 'text-red-700', bg: 'bg-red-100', icon: '✗' },
  }[status];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="page-container py-8 max-w-2xl mx-auto">
          <h1 className="section-title mb-1">Verification Centre</h1>
          <p className="text-slate-500">Upload your documents and profile photo to become a verified QuickFix Pro</p>
        </div>
      </div>

      <div className="page-container py-8 max-w-2xl mx-auto space-y-6">
        {/* Status card */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Verification Status</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.icon} {statusConfig.label}
              </div>
            </div>
            {status === 'APPROVED' && verification?.verifiedAt && (
              <p className="text-xs text-slate-400">
                Verified {formatDistanceToNow(new Date(verification.verifiedAt), { addSuffix: true })}
              </p>
            )}
          </div>

          {status === 'REJECTED' && verification?.notes && (
            <Alert type="error" className="mt-4">
              <strong>Rejection reason:</strong> {verification.notes}
              <p className="mt-1 text-sm">Please re-upload your documents and try again.</p>
            </Alert>
          )}
          {status === 'PENDING' && (
            <Alert type="info" className="mt-4">
              Your documents are under review. Admin will respond within 24–48 hours.
            </Alert>
          )}
          {status === 'APPROVED' && (
            <Alert type="success" className="mt-4">
              🎉 You're a verified pro! You can now bid on jobs and be hired by customers.
            </Alert>
          )}
        </div>

        {/* Profile setup */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-lg mb-4">Your Profile</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Business Name</label>
                <input value={profileForm.businessName} onChange={e => setProfileForm(p => ({...p, businessName: e.target.value}))}
                  placeholder="e.g. Smith Plumbing" className="input" />
              </div>
              <div>
                <label className="label">Category *</label>
                <input value={profileForm.category} onChange={e => setProfileForm(p => ({...p, category: e.target.value}))}
                  placeholder="e.g. Plumbing" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea value={profileForm.bio} onChange={e => setProfileForm(p => ({...p, bio: e.target.value}))}
                rows={3} placeholder="Tell customers about your experience..." className="input resize-none" />
            </div>
            <div>
              <label className="label">Skills (comma-separated)</label>
              <input value={profileForm.skills} onChange={e => setProfileForm(p => ({...p, skills: e.target.value}))}
                placeholder="e.g. Pipe repair, Drain cleaning, Water heater" className="input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Min Rate ($/hr)</label>
                <input type="number" value={profileForm.hourlyRateMin} onChange={e => setProfileForm(p => ({...p, hourlyRateMin: e.target.value}))}
                  placeholder="75" className="input" />
              </div>
              <div>
                <label className="label">Max Rate ($/hr)</label>
                <input type="number" value={profileForm.hourlyRateMax} onChange={e => setProfileForm(p => ({...p, hourlyRateMax: e.target.value}))}
                  placeholder="120" className="input" />
              </div>
              <div>
                <label className="label">Response (mins)</label>
                <select value={profileForm.responseMinutes} onChange={e => setProfileForm(p => ({...p, responseMinutes: parseInt(e.target.value)}))}
                  className="input">
                  {[15,30,60,120,240].map(m => <option key={m} value={m}>{m}m</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">
              {savingProfile ? <><Spinner size="sm" /> Saving...</> : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Profile Photo — REQUIRED */}
        <div>
          <h2 className="font-display font-bold text-lg mb-3">
            Profile Photo <span className="text-red-500 text-sm font-normal">(Required — must be taken within 6 months)</span>
          </h2>
          <ProfilePhotoUploader
            currentUrl={profile?.profilePhotoUrl}
            onUploaded={async () => { await loadData(); await refreshUser?.(); }}
          />
        </div>

        {/* Documents */}
        <div>
          <h2 className="font-display font-bold text-lg mb-3">Verification Documents</h2>
          <div className="space-y-3">
            {DOC_TYPES.map(dt => (
              <DocUploader
                key={dt.value}
                docType={dt}
                existingDoc={verification?.documents?.find(d => d.docType === dt.value)}
                onUploaded={loadData}
              />
            ))}
          </div>
        </div>

        {/* Request Verification */}
        {['UNVERIFIED', 'REJECTED'].includes(status) && (
          <div className="card p-6 text-center">
            <h3 className="font-display font-bold text-lg mb-3">Checklist to Submit</h3>
            <div className="flex justify-center gap-6 mb-5">
              {[
                { label: 'Profile Photo', has: hasPhoto },
                { label: 'Gov. ID', has: hasId },
                { label: 'Certificate', has: hasCert },
              ].map(item => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                    ${item.has ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {item.has ? '✓' : '○'}
                  </div>
                  <span className={`text-xs font-medium ${item.has ? 'text-emerald-700' : 'text-slate-500'}`}>{item.label}</span>
                </div>
              ))}
            </div>
            {!hasRequired && (
              <p className="text-sm text-slate-500 mb-4">
                Complete all 3 requirements above before requesting verification.
              </p>
            )}
            <button
              onClick={handleRequestVerification}
              disabled={!hasRequired || requesting}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed px-8"
            >
              {requesting ? <><Spinner size="sm" /> Submitting...</> : 'Request Verification →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
