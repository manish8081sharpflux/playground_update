import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [timeSummary,   setTimeSummary]   = useState([]);
  const [loginHistory,  setLoginHistory]  = useState([]);
  const [gameWallet,    setGameWallet]    = useState({ totalCoins: 0 });
  const [gameLogs,      setGameLogs]      = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sRes] = await Promise.all([
          api.get('/sessions/summary'),
        ]);
        setTimeSummary(sRes.data);
        setLoginHistory(user.loginHistory?.slice(-5).reverse() || []);

        // fetch game wallet + logs
        try {
          const [wRes, gRes] = await Promise.all([
            api.get('/gcompris/wallet'),
            api.get('/gcompris/logs'),
          ]);
          setGameWallet(wRes.data || { totalCoins: 0 });
          setGameLogs(gRes.data || []);
        } catch { /* games not played yet */ }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const totalTime   = timeSummary.reduce((a, t) => a + (t.totalMin || 0), 0);
  const totalGames  = gameLogs.length;
  const gamesPlayed = new Set(gameLogs.map(l => l.activityName)).size;

  if (loading) return <div className="loading-screen">Loading dashboard...</div>;

  const chartData = timeSummary.map(t => ({
    name:    t.courseTitle?.split(' ').slice(0, 2).join(' ') || 'Unknown',
    minutes: t.totalMin || 0,
  }));

  // Game activity bar chart — sessions per activity
  const gameChartData = Object.values(
    gameLogs.reduce((acc, log) => {
      const key = log.activityTitle || log.activityName;
      if (!acc[key]) acc[key] = { name: key.split(' ').slice(0, 2).join(' '), sessions: 0, coins: 0 };
      acc[key].sessions += 1;
      acc[key].coins    += log.coinsAwarded || 0;
      return acc;
    }, {})
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Welcome back, {user.name.split(' ')[0]} 👋</h1>
        <p>Here's your learning progress overview</p>
      </div>

      {/* ── Stats Grid ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total time spent</div>
          <div className="stat-value">{totalTime}</div>
          <div className="stat-sub">minutes learning</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Coins earned 🪙</div>
          <div className="stat-value" style={{ color: '#854F0B' }}>
            {gameWallet.totalCoins || 0}
          </div>
          <div className="stat-sub">from GCompris games</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Games played</div>
          <div className="stat-value">{totalGames}</div>
          <div className="stat-sub">{gamesPlayed} unique activities</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Last login</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>
            {user.lastLogin
              ? new Date(user.lastLogin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : 'Today'}
          </div>
          <div className="stat-sub">
            {user.lastLogin
              ? new Date(user.lastLogin).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : ''}
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Game sessions chart */}
        <div className="card">
          <div className="section-title">Game sessions per activity</div>
          {gameChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gameChartData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v, n) => [v, n === 'sessions' ? 'Sessions' : 'Coins']} />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {gameChartData.map((_, i) => (
                    <Cell key={i} fill="#4f46e5" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>Play a game to see activity data</p></div>
          )}
        </div>

        {/* Login history */}
        <div className="card">
          <div className="section-title">Login history</div>
          {loginHistory.length > 0 ? (
            <div className="activity-log">
              {loginHistory.map((l, i) => (
                <div className="activity-item" key={i}>
                  <div className="activity-dot" />
                  <div>
                    <div>Signed in</div>
                    <div className="activity-time">
                      {new Date(l.loginAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>Login history will appear here</p></div>
          )}
        </div>
      </div>

      {/* ── Coins earned chart ── */}
      {gameChartData.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="section-title">Coins earned per activity 🪙</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gameChartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={v => [`${v} 🪙`, 'Coins']} />
              <Bar dataKey="coins" radius={[4, 4, 0, 0]}>
                {gameChartData.map((_, i) => (
                  <Cell key={i} fill="#f59e0b" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent game activity table ── */}
      {gameLogs.length > 0 ? (
        <>
          <div className="section-title">Recent game activity</div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Duration</th>
                    <th>Score</th>
                    <th>Coins</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {gameLogs.slice(0, 8).map(log => (
                    <tr key={log._id}>
                      <td style={{ fontWeight: 500 }}>
                        {log.activityTitle || log.activityName}
                      </td>
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
            <div style={{ textAlign: 'right', marginTop: '0.75rem' }}>
              <Link to="/games" style={{ fontSize: '0.85rem', color: '#4f46e5' }}>
                View all games →
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state card" style={{ marginTop: '1rem' }}>
          <h3>No games played yet</h3>
          <p>Go to the <Link to="/games" style={{ color: '#4f46e5' }}>Games page</Link> to start playing!</p>
        </div>
      )}

    </div>
  );
}