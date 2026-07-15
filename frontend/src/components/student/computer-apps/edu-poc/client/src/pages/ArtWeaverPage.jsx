import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';

const STATUS_COLORS = {
  submitted: { bg: '#eff6ff', color: '#1e40af', label: '⏳ Pending Review' },
  evaluated: { bg: '#f0fdf4', color: '#166534', label: '✅ Evaluated' },
  returned:  { bg: '#fefce8', color: '#854d0e', label: '↩ Returned' },
};

export default function ArtWeaverPage() {
  const [artworks,    setArtworks]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [selected,    setSelected]    = useState(null);   // artwork detail modal
  const [tab,         setTab]         = useState('gallery'); // 'gallery' | 'submit'
  const [form,        setForm]        = useState({ title: '', description: '' });
  const [imageData,   setImageData]   = useState(null);   // base64
  const [imagePreview, setImagePreview] = useState(null);
  const [msg,         setMsg]         = useState(null);
  const fileRef = useRef();

  const load = async () => {
    try {
      const { data } = await api.get('/artweaver/my');
      setArtworks(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Handle file pick (PNG/JPG from ArtWeaver export) ──────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/'))
      return setMsg({ type: 'error', text: 'Please select an image file (PNG, JPG)' });

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageData(ev.target.result);
      setImagePreview(ev.target.result);
      setMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // ── Submit drawing ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!imageData) return setMsg({ type: 'error', text: 'Please select a drawing to upload' });
    if (!form.title.trim()) return setMsg({ type: 'error', text: 'Please enter a title' });

    setSubmitting(true);
    setMsg(null);
    try {
      await api.post('/artweaver/submit', {
        imageData,
        title:       form.title.trim(),
        description: form.description.trim(),
      });
      setMsg({ type: 'success', text: '🎨 Drawing submitted successfully! Your teacher will review it soon.' });
      setForm({ title: '', description: '' });
      setImageData(null);
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = '';
      await load();
      setTimeout(() => setTab('gallery'), 1500);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };


  // ── Open detail modal ──────────────────────────────────────────────────────
  const openDetail = async (artwork) => {
    try {
      const { data } = await api.get(`/artweaver/my/${artwork._id}`);
      setSelected(data);
    } catch { setSelected(artwork); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this drawing?')) return;
    try {
      await api.delete(`/artweaver/my/${id}`);
      setArtworks(prev => prev.filter(a => a._id !== id));
      setSelected(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <div className="loading-screen">Loading your artwork...</div>;

  const pending   = artworks.filter(a => a.status === 'submitted').length;
  const evaluated = artworks.filter(a => a.status === 'evaluated').length;
  const avgPoints = evaluated > 0
    ? Math.round(artworks.filter(a => a.status === 'evaluated')
        .reduce((s, a) => s + (a.points || 0), 0) / evaluated)
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>🎨 ArtWeaver Studio</h1>
        <p>Submit your drawings and see your teacher's feedback</p>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total submitted</div>
          <div className="stat-value">{artworks.length}</div>
          <div className="stat-sub">drawings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending review</div>
          <div className="stat-value" style={{ color: '#1e40af' }}>{pending}</div>
          <div className="stat-sub">waiting for teacher</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Evaluated</div>
          <div className="stat-value" style={{ color: '#166534' }}>{evaluated}</div>
          <div className="stat-sub">reviewed by teacher</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg score</div>
          <div className="stat-value" style={{ color: '#854F0B' }}>
            {avgPoints !== null ? `${avgPoints}/100` : '—'}
          </div>
          <div className="stat-sub">across evaluated</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['gallery', 'submit'].map(t => (
          <button key={t}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setTab(t); setMsg(null); }}>
            {t === 'gallery' ? '🖼 My Drawings' : '➕ Submit New'}
          </button>
        ))}
      </div>
  <div style={{
  background: '#f0fdf4', border: '1px solid #bbf7d0',
  borderRadius: 12, padding: '1rem', marginBottom: '1.25rem',
  display: 'flex', alignItems: 'center', gap: '1rem',
}}>
  <div style={{ fontSize: 36 }}>🎨</div>
  <div style={{ flex: 1 }}>
    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
      Don't have a drawing yet?
    </div>
    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
      Open ArtWeaver, draw something, save it as PNG, then upload below.
    </div>
  </div>
<button
  className="btn btn-primary"
  onClick={() => {
    const token     = localStorage.getItem('token') || '';
    const serverUrl = encodeURIComponent(window.location.origin);
    window.location.href = `eduart://open?token=${token}&serverUrl=${serverUrl}&t=${Date.now()}`;
  }}
>
  🖌 Draw Art
</button>
</div>
      {/* ══════════════════ SUBMIT TAB ══════════════════ */}
      {tab === 'submit' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="section-title">Submit a Drawing</div>

          {msg && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem',
              background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color:      msg.type === 'success' ? '#166534' : '#991b1b',
              fontSize: '0.88rem',
            }}>
              {msg.text}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label>Drawing title *</label>
            <input className="form-control"
              placeholder="e.g. My House, Sunset Scene..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea className="form-control" rows={2}
              placeholder="Tell your teacher what you drew..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>

          {/* File upload */}
          <div className="form-group">
            <label>Upload drawing (PNG / JPG from ArtWeaver) *</label>
            <div style={{
              border: '2px dashed #cbd5e1', borderRadius: 12,
              padding: '1.5rem', textAlign: 'center',
              cursor: 'pointer', background: '#f8fafc',
              transition: 'border-color .2s',
            }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile({ target: { files: [f] } });
              }}>
              {imagePreview ? (
                <img src={imagePreview} alt="preview"
                  style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 8 }} />
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: '0.5rem' }}>🖼</div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    Click or drag & drop your drawing here
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                    PNG, JPG supported
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleFile} />
            {imagePreview && (
              <button className="btn btn-sm btn-outline" style={{ marginTop: '0.5rem' }}
                onClick={() => { setImageData(null); setImagePreview(null); fileRef.current.value = ''; }}>
                Remove image
              </button>
            )}
          </div>

          <button className="btn btn-primary btn-full"
            onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : '🚀 Submit Drawing'}
          </button>
        </div>
      )}

      {/* ══════════════════ GALLERY TAB ══════════════════ */}
      {tab === 'gallery' && (
        <>
          {artworks.length === 0 ? (
            <div className="empty-state card">
              <h3>No drawings yet</h3>
              <p>Submit your first ArtWeaver drawing to get feedback from your teacher!</p>
              <button className="btn btn-primary" onClick={() => setTab('submit')}>
                ➕ Submit Drawing
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}>
              {artworks.map(art => {
                const s = STATUS_COLORS[art.status] || STATUS_COLORS.submitted;
                return (
                  <div key={art._id} className="card"
                    style={{ cursor: 'pointer', padding: '0.85rem' }}
                    onClick={() => openDetail(art)}>

                    {/* Thumbnail placeholder */}
                    <div style={{
                      height: 130, background: '#f1f5f9', borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '0.75rem', fontSize: 40,
                    }}>
                      🎨
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                      {art.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                      {new Date(art.createdAt).toLocaleDateString('en-IN')}
                    </div>

                    {/* Status badge */}
                    <div style={{
                      display: 'inline-block', fontSize: '0.75rem', fontWeight: 600,
                      padding: '0.2rem 0.6rem', borderRadius: 99,
                      background: s.bg, color: s.color,
                    }}>
                      {s.label}
                    </div>

                    {/* Score if evaluated */}
                    {art.status === 'evaluated' && (
                      <div style={{
                        marginTop: '0.5rem', fontSize: '0.85rem',
                        fontWeight: 700, color: '#854F0B',
                      }}>
                        {art.points}/100 · +{art.coinsAwarded} 🪙
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════ DETAIL MODAL ══════════════════ */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(8,8,20,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
          onClick={() => setSelected(null)}>
          <div style={{
            background: '#fff', borderRadius: 20, width: 'min(620px, 95vw)',
            maxHeight: '90vh', overflowY: 'auto',
            padding: '2rem', boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1b4b', margin: 0 }}>
                {selected.title}
              </h2>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', fontSize: '1.4rem',
                cursor: 'pointer', color: '#64748b',
              }}>✕</button>
            </div>

            {/* Image */}
            {selected.imageData && (
              <img src={selected.imageData} alt={selected.title}
                style={{ width: '100%', borderRadius: 12, marginBottom: '1rem', border: '1px solid #e2e8f0' }} />
            )}

            {/* Description */}
            {selected.description && (
              <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1rem' }}>
                {selected.description}
              </p>
            )}

            {/* Status */}
            <div style={{ marginBottom: '1rem' }}>
              {(() => {
                const s = STATUS_COLORS[selected.status] || STATUS_COLORS.submitted;
                return (
                  <span style={{
                    fontSize: '0.82rem', fontWeight: 600,
                    padding: '0.3rem 0.8rem', borderRadius: 99,
                    background: s.bg, color: s.color,
                  }}>
                    {s.label}
                  </span>
                );
              })()}
            </div>

            {/* Evaluation result */}
            {selected.status === 'evaluated' && (
              <div style={{
                background: '#f8fafc', borderRadius: 14,
                padding: '1.25rem', marginBottom: '1rem',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', color: '#1e1b4b' }}>
                  Teacher's Evaluation
                </div>

                {/* Score bar */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Score</span>
                    <span style={{ fontWeight: 700, color: '#4f46e5' }}>{selected.points} / 100</span>
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10 }}>
                    <div style={{
                      width: `${selected.points}%`, height: '100%',
                      borderRadius: 99,
                      background: selected.points >= 75 ? '#16a34a' : selected.points >= 50 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* Coins */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  background: '#fefce8', padding: '0.4rem 0.9rem',
                  borderRadius: 99, fontSize: '0.88rem',
                  color: '#854d0e', fontWeight: 600, marginBottom: '0.75rem',
                }}>
                  🪙 +{selected.coinsAwarded} coins awarded
                </div>

                {/* Feedback */}
                {selected.feedback && (
                  <div style={{
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: 10, padding: '0.85rem',
                  }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 600 }}>
                      💬 Teacher's Feedback
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.6 }}>
                      {selected.feedback}
                    </div>
                  </div>
                )}

                {selected.evaluatedAt && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    Evaluated on {new Date(selected.evaluatedAt).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            )}

            {/* Pending message */}
            {selected.status === 'submitted' && (
              <div style={{
                background: '#eff6ff', borderRadius: 12, padding: '1rem',
                fontSize: '0.88rem', color: '#1e40af', marginBottom: '1rem',
              }}>
                ⏳ Your drawing has been submitted and is waiting for your teacher to review it.
              </div>
            )}

            {/* Delete button */}
            {selected.status === 'submitted' && (
              <button className="btn btn-danger btn-sm"
                onClick={() => handleDelete(selected._id)}>
                🗑 Delete submission
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}