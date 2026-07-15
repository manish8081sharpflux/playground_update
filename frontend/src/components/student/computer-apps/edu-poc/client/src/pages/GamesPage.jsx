import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';

// ── Full GCompris activity list ───────────────────────────────────────────────
const ACTIVITIES = [
  // Math
  { name: 'algebra_by',         title: 'Table Memory',       category: 'Math',     icon: '✖️',  desc: 'Multiplication tables game' },
  { name: 'algebra_plus',       title: 'Addition',           category: 'Math',     icon: '➕',  desc: 'Practice addition skills' },
  { name: 'algebra_minus',      title: 'Subtraction',        category: 'Math',     icon: '➖',  desc: 'Practice subtraction' },
  { name: 'algebra_div',        title: 'Division',           category: 'Math',     icon: '➗',  desc: 'Division practice' },
  { name: 'clockgame',          title: 'Read the Clock',     category: 'Math',     icon: '🕐',  desc: 'Learn to tell the time' },
  { name: 'money',              title: 'Count Money',        category: 'Math',     icon: '💰',  desc: 'Count coins and notes' },
  // Reading
  { name: 'wordsgame',          title: 'Words Game',         category: 'Reading',  icon: '📝',  desc: 'Type falling letters' },
  { name: 'hangman',            title: 'Hangman',            category: 'Reading',  icon: '🔤',  desc: 'Guess the hidden word' },
  // Science
  { name: 'geography',          title: 'World Geography',    category: 'Science',  icon: '🌍',  desc: 'Place countries on map' },
  { name: 'canal_lock',         title: 'Canal Lock',         category: 'Science',  icon: '🚢',  desc: 'Water level simulation' },
  { name: 'electric',           title: 'Electricity',        category: 'Science',  icon: '⚡',  desc: 'Build electric circuits' },
  // Brain / Memory
  { name: 'memory',             title: 'Memory Match',       category: 'Brain',    icon: '🧠',  desc: 'Flip and match cards' },
  { name: 'simon_says',         title: 'Simon Says',         category: 'Brain',    icon: '🎮',  desc: 'Repeat the sequence' },
  // Strategy
  { name: 'chess',              title: 'Chess',              category: 'Strategy', icon: '♟️',  desc: 'Classic chess game' },
  { name: 'sudoku',             title: 'Sudoku',             category: 'Strategy', icon: '🔢',  desc: 'Fill the number grid' },
  { name: 'connect4',           title: 'Connect 4',          category: 'Strategy', icon: '🔴',  desc: 'Four in a row game' },
  // Creative
  { name: 'drawing',            title: 'Drawing',            category: 'Creative', icon: '🎨',  desc: 'Free drawing canvas' },
];

const makeSessionId = () =>
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const fmtTime = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ─────────────────────────────────────────────────────────────────────────────
// GameOverlay  — shown on top of the page while GCompris is running
// ─────────────────────────────────────────────────────────────────────────────
function GameOverlay({ activity, sessionId, onClose }) {
  const [elapsed, setElapsed] = useState(0);
  const [polling, setPolling] = useState(true);
  const startRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    const t = setInterval(() =>
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll — auto close when result arrives, no result card
  useEffect(() => {
    if (!polling) return;
    const iv = setInterval(async () => {
      try {
        const { data } = await api.get(`/gcompris/latest/${sessionId}`);
        if (data && data._id) {
          setPolling(false);
          onClose(); // go straight back to games page
        }
      } catch { /* not ready yet */ }
    }, 3000);
    return () => clearInterval(iv);
  }, [polling, sessionId, onClose]);

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(8, 8, 20, 0.90)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(6px)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  };

  const cardStyle = {
    background: '#ffffff',
    borderRadius: 24,
    padding: '2.75rem 2.5rem 2.25rem',
    width: 'min(440px, 92vw)',
    textAlign: 'center',
    boxShadow: '0 32px 100px rgba(0,0,0,0.5)',
    animation: 'gcPopIn .28s cubic-bezier(0.34,1.56,0.64,1)',
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 56, lineHeight: 1.1, marginBottom: '0.5rem' }}>
          {activity.icon}
        </div>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 0.35rem' }}>
          {activity.title} is running
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.75rem', lineHeight: 1.65 }}>
          GCompris has opened on your screen.<br />
          Play the game, then <strong>close GCompris</strong> when you finish.
        </p>

        {/* Live timer pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.7rem',
          background: '#eef2ff', borderRadius: 99,
          padding: '0.65rem 1.6rem', marginBottom: '1.75rem',
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#ef4444', display: 'inline-block',
            animation: 'gcBlink 1s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: 'monospace', fontSize: '1.9rem',
            fontWeight: 800, color: '#3730a3', letterSpacing: 3,
          }}>
            {fmtTime(elapsed)}
          </span>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
          ⏳ Waiting for GCompris to close…
        </p>

        {/* Spinner dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '1.5rem' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#c7d2fe', display: 'inline-block',
              animation: `gcDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>

        <button onClick={onClose} style={{
          background: 'transparent', border: '1.5px solid #e2e8f0',
          borderRadius: 8, padding: '0.45rem 1.25rem',
          fontSize: '0.85rem', color: '#64748b', cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes gcPopIn {
          from { transform: scale(0.82); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes gcBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.15; }
        }
        @keyframes gcDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GamesPage — main component
// ─────────────────────────────────────────────────────────────────────────────
export default function GamesPage() {
  const [logs,    setLogs]    = useState([]);
  const [wallet,  setWallet]  = useState({ totalCoins: 0, transactions: [] });
  const [configs, setConfigs] = useState([]);
  const [filter,  setFilter]  = useState('All');
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(null);   // { activity, sessionId } | null

  const loadData = useCallback(async () => {
    try {
      const [l, w, c] = await Promise.all([
        api.get('/gcompris/logs'),
        api.get('/gcompris/wallet'),
        api.get('/coin-config'),
      ]);
      setLogs(l.data);
      setWallet(w.data);
      setConfigs(c.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);

  // ── Handle "Open GCompris" click ──────────────────────────────────────────
  const handleOpen = (activity) => {
    const sessionId = makeSessionId();
    const token     = localStorage.getItem('token') || '';
    const serverUrl = window.location.origin;

    // Build: edubridge://open?activity=algebra_by&sessionId=xxx&token=xxx&serverUrl=xxx
    // Windows registry (from register.bat) maps edubridge:// → gcompris-qt.exe
    const params = new URLSearchParams({ activity: activity.name, sessionId, token, serverUrl });
    const url    = `edubridge://open?${params.toString()}`;

    // This line opens GCompris on the same screen — no new tab, no navigation
    window.location.href = url;

    // Show the in-page overlay immediately
    setActive({ activity, sessionId });
  };

  const handleClose = () => {
    setActive(null);
    loadData();   // refresh wallet + history table
  };

  const getMaxCoins = (name) => {
    const m = configs.filter(c => c.activityName === name);
    return m.length ? Math.max(...m.map(c => c.coins)) : null;
  };

  const categories = ['All', ...new Set(ACTIVITIES.map(a => a.category))];
  const filtered   = filter === 'All' ? ACTIVITIES : ACTIVITIES.filter(a => a.category === filter);
  const playedSet  = new Set(logs.map(l => l.activityName));

  if (loading) return <div className="loading-screen">Loading games...</div>;

  return (
    <div className="page">

      {/* ── Overlay (shown while GCompris is running) ─────────────────────── */}
      {active && (
        <GameOverlay
          activity={active.activity}
          sessionId={active.sessionId}
          onClose={handleClose}
        />
      )}

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <h1>GCompris Games</h1>
            <p>Click a game card to open GCompris on this screen</p>
          </div>

          {/* Coin wallet badge */}
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.85rem 1.25rem', minWidth: 155,
          }}>
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🪙</span>
            <div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#854F0B', lineHeight: 1 }}>
                {wallet.totalCoins}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>coins earned</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Setup notice ────────────────────────────────────────────────────
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: 10, padding: '0.85rem 1.1rem',
        fontSize: '0.85rem', color: '#92400e',
        marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
        <div>
          <strong>First time on this PC?</strong> Ask your teacher to run{' '}
          <code style={{ background: '#fef3c7', padding: '1px 5px', borderRadius: 4 }}>
            register.bat
          </code>{' '}
          once as Administrator. After that, every "Open GCompris" click works automatically.
        </div>
      </div> */}

      {/* ── Category filter ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {categories.map(cat => (
          <button key={cat}
            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── Game cards ────────────────────────────────────────────────────── */}
      <div className="courses-grid" style={{ marginBottom: '2rem' }}>
        {filtered.map(activity => {
          const maxCoins = getMaxCoins(activity.name);
          const played   = playedSet.has(activity.name);
          const lastLog  = logs.find(l => l.activityName === activity.name);

          return (
            <div className="card" key={activity.name}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              {/* Top row: icon + played badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '2rem', lineHeight: 1 }}>{activity.icon}</span>
                {played && <span className="badge badge-success">✓ Played</span>}
                {!played && <span className="badge badge-primary">{activity.category}</span>}
              </div>

              {/* Title + description */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{activity.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                  {activity.desc}
                </div>
              </div>

              {/* Coin reward */}
              {maxCoins !== null && (
                <div style={{
                  fontSize: '0.82rem', color: '#854F0B',
                  background: '#FAEEDA', padding: '0.3rem 0.65rem',
                  borderRadius: 6, display: 'inline-flex',
                  alignItems: 'center', gap: '0.35rem', width: 'fit-content',
                }}>
                  🪙 up to {maxCoins} coins per level
                </div>
              )}

              {/* Last played info */}
                {lastLog && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span>Level {lastLog.level} / 6</span>
                      <span>{Math.round((lastLog.level / 6) * 100)}%</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar" 
                          style={{ width: `${(lastLog.level / 6) * 100}%` }} />
                    </div>
                  </div>
                )}

              {/* ── THE BUTTON ── */}
              <button
                onClick={() => handleOpen(activity)}
                className="btn btn-primary"
                style={{ marginTop: 'auto', justifyContent: 'center' }}
              >
                🎮 Open GCompris
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Game history table ────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <>
          <div className="section-title">Game history</div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Level</th>
                    <th>Duration</th>
                    <th>Score</th>
                    <th>Coins</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 20).map(log => (
                    <tr key={log._id}>
                      <td style={{ fontWeight: 500 }}>{log.activityTitle || log.activityName}</td>
                      <td>Level {log.level}</td>
                      <td>{Math.round((log.durationMs || 0) / 60000)} min</td>
                      <td>
                        <span className={`badge ${log.passed ? 'badge-success' : 'badge-warning'}`}>
                          {log.score}%
                        </span>
                      </td>
                      <td style={{ color: '#854F0B', fontWeight: 600 }}>
                        {log.coinsAwarded > 0 ? `+${log.coinsAwarded} 🪙` : '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {new Date(log.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
