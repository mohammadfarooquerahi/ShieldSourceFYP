import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import api from '../services/api.js';

const INCIDENT_TYPES = [
  { value: 'hacking', label: 'Hacking / System Compromise' },
  { value: 'malware', label: 'Malware Infection' },
  { value: 'ransomware', label: 'Ransomware Attack' },
  { value: 'phishing', label: 'Phishing Attack' },
  { value: 'data_theft', label: 'Data Theft / Breach' },
  { value: 'unauthorized_access', label: 'Unauthorized Access' },
  { value: 'ddos', label: 'DDoS Attack' },
  { value: 'insider_threat', label: 'Insider Threat' },
  { value: 'social_engineering', label: 'Social Engineering' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { value: 'high', label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { value: 'critical', label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
];

async function computeSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ReportIncident() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    type: '',
    severity: 'medium',
    description: '',
  });

  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [hashLoading, setHashLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const processFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setFileHash('');
    setHashLoading(true);
    try {
      const hash = await computeSHA256(selectedFile);
      setFileHash(hash);
    } catch {
      setFileHash('Error computing hash');
    } finally {
      setHashLoading(false);
    }
  }, []);

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const removeFile = () => {
    setFile(null);
    setFileHash('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('Incident title is required.');
    if (!form.type) return setError('Please select an incident type.');
    if (!form.description.trim() || form.description.trim().length < 20)
      return setError('Description must be at least 20 characters.');

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('type', form.type);
      formData.append('severity', form.severity);
      formData.append('description', form.description);
      if (file) {
        formData.append('evidence', file);   // ← must match upload.single('evidence') on backend
        formData.append('sha256Hash', fileHash);
      }

      await api.post('/incidents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Incident reported successfully! Our team will respond shortly.');
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit incident. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-200">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Report Security Incident</h1>
                <p className="text-slate-400 text-sm">Fill in the details below. Be as specific as possible.</p>
              </div>
            </div>
          </div>

          {/* Alert */}
          <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-brand-red/10 border border-brand-red/20 text-sm">
            <svg className="w-5 h-5 text-brand-red flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-300">
              <strong className="text-white">Emergency?</strong> If you&apos;re experiencing an active cyberattack causing immediate damage, call your IT team immediately while filing this report.
            </span>
          </div>

          {/* Success / Error */}
          {success && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form Card */}
          <div className="glass-card border border-white/10 overflow-hidden">
            <div className="border-b border-white/10 px-8 py-5 bg-white/3">
              <h2 className="text-lg font-bold text-white">Incident Details</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Incident Title <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Brief, clear description of the incident"
                  className="input-field"
                  maxLength={200}
                />
                <p className="text-xs text-slate-600 mt-1">{form.title.length}/200 characters</p>
              </div>

              {/* Type + Severity row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Incident Type <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="input-field appearance-none cursor-pointer"
                    >
                      <option value="">Select type...</option>
                      {INCIDENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Severity Level</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SEVERITY_LEVELS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, severity: s.value }))}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                          form.severity === s.value
                            ? `${s.bg} ${s.color}`
                            : 'bg-dark-50 border-white/10 text-slate-500 hover:border-white/20'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Incident Description <span className="text-brand-red">*</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe what happened, when it started, what systems are affected, what you've already done to contain it, and any other relevant details..."
                  rows={6}
                  className="input-field resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {form.description.length} characters (minimum 20 required)
                </p>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Evidence File{' '}
                  <span className="text-slate-500 font-normal">(optional — logs, screenshots, malware samples)</span>
                </label>

                {!file ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                      isDragOver
                        ? 'border-brand-red bg-brand-red/10 scale-[1.02]'
                        : 'border-white/20 hover:border-white/40 hover:bg-white/3'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".txt,.log,.pdf,.png,.jpg,.jpeg,.zip,.pcap,.csv,.json,.xml"
                    />
                    <div className={`flex flex-col items-center gap-3 ${isDragOver ? 'text-brand-red' : 'text-slate-500'}`}>
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div>
                        <p className="font-semibold text-slate-300">Drop file here or click to browse</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Supports: .txt, .log, .pdf, .png, .jpg, .zip, .pcap, .csv, .json, .xml
                        </p>
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-brand-red/20 border border-brand-red/30 text-brand-red text-sm font-semibold">
                        SHA-256 hash will be computed automatically
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-white/15 rounded-2xl overflow-hidden">
                    {/* File info header */}
                    <div className="flex items-center justify-between p-4 bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{file.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* SHA-256 Hash display */}
                    <div className="p-4 bg-dark-100">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-xs font-semibold text-brand-green uppercase tracking-wider">SHA-256 Integrity Hash</span>
                      </div>
                      {hashLoading ? (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Computing SHA-256 hash...
                        </div>
                      ) : (
                        <code className="block text-xs font-mono text-brand-green bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2 break-all leading-relaxed">
                          {fileHash}
                        </code>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 px-8 py-4 text-base flex-1"
                >
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit Incident Report
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary px-6 py-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
