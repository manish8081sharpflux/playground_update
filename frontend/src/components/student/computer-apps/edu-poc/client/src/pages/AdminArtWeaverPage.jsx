import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const STATUS_COLORS = {
  submitted: { bg: '#eff6ff', color: '#1e40af', label: '⏳ Pending' },
  evaluated: { bg: '#f0fdf4', color: '#166534', label: '✅ Evaluated' },
};

export default function AdminArtWeaverPage() {
  const [artworks,  setArtworks]  = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);  // artwork being evaluated
  const [filter,    setFilter]    = useState('all'); // 'all' | 'submitted' | 'evaluated'
  const [search,    setSearch]    = useState('');
  const [evalForm,  setEvalForm]  = useState({ points: '', feedback: '' });
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);

  const load = async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        api.get('/artweaver/admin/all'),
        api.get('/artweaver/admin/stats'),
      ]);
      setArtworks(aRes.data);
      setStats(sRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Open artwork for evaluation ───────────────────────────────────────────
  const openEval = async (art) => {
    try {
      const { data } = await api.get(`/artweaver/admin/${art._id}`);
      setSelected(data);
      setEvalForm({
        points:   data.points !== null ? String(data.points) : '',
        feedback: data.feedback || '',
      });
      setMsg(null);
    } catch { setSelected(art); }
  };

  // ── Submit evaluation ─────────────────────────────────────────────────────
  const handleEvaluate = async () => {
    const pts = parseInt(evalForm.points, 10);
    if (isNaN(pts) || pts < 0 || pts > 100)
      return setMsg({ type: 'error', text: 'Points must be a number between 0 and 100' });

    setSaving(true);
    setMsg(null);
    try {
      const { data } = await api.post(`/artweaver/admin/${selected._id}/evaluate`, {
        points:   pts,
        feedback: evalForm.feedback.trim(),
      });
      setMsg({ type: 'success', text: `✅ Evaluated! ${data.coinsAwarded} coins awarded to student.` });
      await load();
      // Update selected with fresh data
      setSelected(prev => ({ ...prev, ...data.artwork, points: pts, status: 'evaluated' }));
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Evaluation failed' });
    } finally {
      setSaving(false);
    }
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = artworks.filter(a => {
    const matchStatus = filter === 'all' || a.status === filter;
    const matchSearch = !search ||
      a.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.title?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) return <div className="loading-screen">Loading artworks...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>🎨 ArtWeaver Submissions</h1>
        <p>Review and evaluate student drawings</p>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total submissions</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending review</div>
            <div className="stat-value" style={{ color: '#1e40af' }}>{stats.pending}</div>
            <div className="stat-sub">need your attention</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Evaluated</div>
            <div className="stat-value" style={{ color: '#166534' }}>{stats.evaluated}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total coins awarded</div>
            <div className="stat-value" style={{ color: '#854F0B' }}>
              {stats.totalCoinsAwarded} 🪙
            </div>
          </div>
        </div>
      )}

      {/* ── Filters + Search ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        {['all', 'submitted', 'evaluated'].map(f => (
          <button key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'submitted' ? '⏳ Pending' : '✅ Evaluated'}
            {f === 'submitted' && stats?.pending > 0 && (
              <span style={{
                marginLeft: 6, background: '#ef4444', color: '#fff',
                borderRadius: 99, padding: '0 6px', fontSize: '0.72rem',
              }}>
                {stats.pending}
              </span>
            )}
          </button>
        ))}

        <input className="form-control" style={{ maxWidth: 260 }}
          placeholder="🔍 Search by student or title..."
          value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {/* ── Artworks Grid ── */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <h3>No submissions found</h3>
          <p>No artworks match your current filter</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1rem',
        }}>
          {filtered.map(art => {
            const s = STATUS_COLORS[art.status] || STATUS_COLORS.submitted;
            return (
              <div key={art._id} className="card"
                style={{ cursor: 'pointer', padding: '0.85rem', position: 'relative' }}
                onClick={() => openEval(art)}>

                {/* Pending indicator dot */}
                {art.status === 'submitted' && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                )}

                {/* Thumbnail */}
                <div style={{
                  height: 130, background: '#f1f5f9', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '0.75rem', fontSize: 40, overflow: 'hidden',
                }}>
                  🎨
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  {art.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  {art.userId?.name} · {new Date(art.createdAt).toLocaleDateString('en-IN')}
                </div>

                <span style={{
                  fontSize: '0.74rem', fontWeight: 600,
                  padding: '0.2rem 0.55rem', borderRadius: 99,
                  background: s.bg, color: s.color,
                }}>
                  {s.label}
                </span>

                {art.status === 'evaluated' && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#4f46e5' }}>
                    {art.points}/100 · +{art.coinsAwarded} 🪙
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════ EVALUATION MODAL ══════════════════ */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(8,8,20,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
          onClick={() => setSelected(null)}>
          <div style={{
            background: '#fff', borderRadius: 20,
            width: 'min(700px, 96vw)', maxHeight: '92vh',
            overflowY: 'auto', padding: '2rem',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 0.2rem' }}>
                  {selected.title}
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  by <strong>{selected.userId?.name}</strong> ({selected.userId?.email})
                  · {new Date(selected.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', fontSize: '1.4rem',
                cursor: 'pointer', color: '#64748b',
              }}>✕</button>
            </div>

            {/* Two column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

              {/* Left — drawing */}
              <div>
                {selected.imageData ? (
                  <img src={selected.imageData} alt={selected.title}
                    style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0' }} />
                ) : (
                  <div style={{
                    height: 200, background: '#f1f5f9', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 48,
                  }}>🎨</div>
                )}

                {selected.description && (
                  <p style={{
                    marginTop: '0.75rem', fontSize: '0.85rem',
                    color: '#64748b', fontStyle: 'italic',
                  }}>
                    "{selected.description}"
                  </p>
                )}
              </div>

              {/* Right — evaluation form */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: '#1e1b4b' }}>
                  {selected.status === 'evaluated' ? 'Update Evaluation' : 'Evaluate Drawing'}
                </div>

                {msg && (
                  <div style={{
                    padding: '0.65rem 0.9rem', borderRadius: 8, marginBottom: '1rem',
                    background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color:      msg.type === 'success' ? '#166534' : '#991b1b',
                    fontSize: '0.84rem',
                  }}>
                    {msg.text}
                  </div>
                )}

                {/* Points slider + input */}
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>
                    Points (0–100)
                    <span style={{
                      marginLeft: 8, color: '#4f46e5', fontWeight: 700, fontSize: '1.1rem',
                    }}>
                      {evalForm.points || '—'}
                    </span>
                  </label>
                  <input type="range" min="0" max="100" step="1"
                    value={evalForm.points || 0}
                    onChange={e => setEvalForm(f => ({ ...f, points: e.target.value }))}
                    style={{ width: '100%', marginBottom: '0.4rem', accentColor: '#4f46e5' }} />

                  {/* Score labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <span>0 – Needs work</span>
                    <span>50 – Good</span>
                    <span>100 – Excellent</span>
                  </div>

                  {/* Coins preview */}
                  {evalForm.points !== '' && (
                    <div style={{
                      marginTop: '0.5rem', fontSize: '0.82rem',
                      color: '#854d0e', fontWeight: 600,
                      background: '#fefce8', padding: '0.3rem 0.7rem',
                      borderRadius: 8, display: 'inline-block',
                    }}>
                      🪙 Will award: {calcCoinsPreview(parseInt(evalForm.points))} coins
                    </div>
                  )}
                </div>

                {/* Feedback */}
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Feedback / Suggestions</label>
                  <textarea className="form-control" rows={5}
                    placeholder="Great use of colors! Try to work on proportions next time..."
                    value={evalForm.feedback}
                    onChange={e => setEvalForm(f => ({ ...f, feedback: e.target.value }))}
                    style={{ resize: 'vertical' }} />
                </div>

                <button className="btn btn-primary btn-full"
                  onClick={handleEvaluate} disabled={saving || evalForm.points === ''}>
                  {saving ? 'Saving...' : selected.status === 'evaluated' ? '✏️ Update Evaluation' : '✅ Submit Evaluation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

function calcCoinsPreview(points) {
  if (points >= 90) return 20;
  if (points >= 75) return 15;
  if (points >= 60) return 10;
  if (points >= 40) return 5;
  return 2;
}