import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AdminGamesPage() {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null); // expanded student
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    api.get('/gcompris/admin/students')
      .then(r => setStudents(r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const fmtTime = (ms) => {
    const s = Math.floor((ms || 0) / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-screen">Loading student data...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Student Game Activity</h1>
        <p>Monitor student progress and coins earned in GCompris</p>
      </div>

      {/* ── Summary stats ── */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total students</div>
          <div className="stat-value">{students.length}</div>
          <div className="stat-sub">have played games</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total sessions</div>
          <div className="stat-value">
            {students.reduce((a, s) => a + s.totalGames, 0)}
          </div>
          <div className="stat-sub">across all students</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total coins awarded</div>
          <div className="stat-value" style={{ color: '#854F0B' }}>
            {students.reduce((a, s) => a + (s.totalCoins || 0), 0)} 🪙
          </div>
          <div className="stat-sub">across all students</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Most active student</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', marginTop: '0.4rem' }}>
            {students.length > 0
              ? students.reduce((a, b) => a.totalGames > b.totalGames ? a : b).name?.split(' ')[0]
              : '—'}
          </div>
          <div className="stat-sub">by number of sessions</div>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          className="form-control"
          placeholder="🔍 Search student by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* ── Students table ── */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <h3>No game data yet</h3>
          <p>Students haven't played any GCompris games yet</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Total Sessions</th>
                  <th>Coins Earned</th>
                  <th>Activities Played</th>
                  <th>Last Played</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => (
                  <React.Fragment key={student._id}>
                    {/* ── Student row ── */}
                    <tr style={{ cursor: 'pointer' }}
                      onClick={() => setSelected(selected === student._id ? null : student._id)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{student.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{student.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{student.totalGames}</span>
                      </td>
                      <td style={{ color: '#854F0B', fontWeight: 700 }}>
                        {student.totalCoins > 0 ? `${student.totalCoins} 🪙` : '—'}
                      </td>
                      <td>{Object.keys(student.activities).length} games</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {student.recentLogs[0]
                          ? new Date(student.recentLogs[0].createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline">
                          {selected === student._id ? '▲ Hide' : '▼ Details'}
                        </button>
                      </td>
                    </tr>

                    {/* ── Expanded detail row ── */}
                    {selected === student._id && (
                      <tr>
                        <td colSpan={6} style={{ background: '#f8fafc', padding: '1.25rem 1.5rem' }}>

                          {/* Activity breakdown */}
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                              Activity breakdown
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                              gap: '0.6rem',
                            }}>
                              {Object.entries(student.activities).map(([act, data]) => (
                                <div key={act} style={{
                                  background: '#fff', border: '1px solid #e2e8f0',
                                  borderRadius: 10, padding: '0.65rem 0.85rem',
                                }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                    {act.replace(/_/g, ' ')}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>
                                    {data.sessions} session{data.sessions !== 1 ? 's' : ''} ·{' '}
                                    {fmtTime(data.totalMs)} total
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Recent sessions */}
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                              Recent sessions
                            </div>
                            <table style={{ width: '100%', fontSize: '0.83rem' }}>
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
                                {student.recentLogs.slice(0, 8).map(log => (
                                  <tr key={log._id}>
                                    <td style={{ fontWeight: 500 }}>
                                      {log.activityTitle || log.activityName}
                                    </td>
                                    <td>{fmtTime(log.durationMs)}</td>
                                    <td>
                                      <span className={`badge ${log.passed ? 'badge-success' : 'badge-warning'}`}>
                                        {log.score}%
                                      </span>
                                    </td>
                                    <td style={{ color: '#854F0B', fontWeight: 600 }}>
                                      {log.coinsAwarded > 0 ? `+${log.coinsAwarded} 🪙` : '—'}
                                    </td>
                                    <td style={{ color: 'var(--muted)' }}>
                                      {new Date(log.createdAt).toLocaleDateString('en-IN')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}