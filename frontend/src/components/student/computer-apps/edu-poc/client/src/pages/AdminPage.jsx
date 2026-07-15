import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api/axios';

export default function AdminPage() {
  const [students,  setStudents]  = useState([]);
  const [overview,  setOverview]  = useState(null);
  const [selected,  setSelected]  = useState(null);  // selected student detail
  const [detail,    setDetail]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    Promise.all([api.get('/admin/students'), api.get('/admin/overview')])
      .then(([sRes, oRes]) => {
        setStudents(sRes.data);
        setOverview(oRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = async (studentId) => {
    if (selected === studentId) { setSelected(null); setDetail(null); return; }
    setSelected(studentId);
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/admin/students/${studentId}`);
      setDetail(data);
    } catch (err) { console.error(err); }
    finally { setLoadingDetail(false); }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const chartData = students.slice(0,8).map(s => ({
    name: s.name.split(' ')[0],
    completion: s.avgCompletion,
    time: s.totalTimeMin
  }));

  if (loading) return <div className="loading-screen">Loading admin panel...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Monitor all student progress and activity</p>
      </div>

      {/* Overview stats */}
      {overview && (
        <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
          <div className="stat-card">
            <div className="stat-label">Total students</div>
            <div className="stat-value">{overview.totalStudents}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total sessions</div>
            <div className="stat-value">{overview.totalSessions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg. completion</div>
            <div className="stat-value">{overview.avgCompletion}%</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{marginBottom:'1.5rem'}}>
          <div className="section-title">Completion % by student</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" tick={{fontSize:11}} />
              <YAxis domain={[0,100]} tick={{fontSize:11}} />
              <Tooltip formatter={v => [`${v}%`, 'Completion']} />
              <Bar dataKey="completion" radius={[4,4,0,0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.completion >= 80 ? '#10b981' : d.completion >= 40 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Students table */}
      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.75rem'}}>
          <div className="section-title" style={{margin:0}}>Students ({filtered.length})</div>
          <input
            className="form-control"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{maxWidth:240}}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><p>No students found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Courses</th>
                  <th>Avg. completion</th>
                  <th>Time spent</th>
                  <th>Last login</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <React.Fragment key={s._id}>
                    <tr>
                      <td>
                        <div style={{fontWeight:500}}>{s.name}</div>
                        <div style={{fontSize:'0.78rem', color:'var(--muted)'}}>{s.email}</div>
                      </td>
                      <td>{s.coursesEnrolled}</td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                          <div style={{width:60, background:'var(--border)', borderRadius:99, height:6, overflow:'hidden'}}>
                            <div style={{width:`${s.avgCompletion}%`, height:'100%', background: s.avgCompletion >= 80 ? 'var(--success)' : s.avgCompletion >= 40 ? 'var(--warning)' : 'var(--danger)', borderRadius:99}} />
                          </div>
                          <span style={{fontSize:'0.85rem'}}>{s.avgCompletion}%</span>
                        </div>
                      </td>
                      <td>{s.totalTimeMin} min</td>
                      <td style={{fontSize:'0.85rem', color:'var(--muted)'}}>
                        {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => loadDetail(s._id)}>
                          {selected === s._id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {selected === s._id && (
                      <tr>
                        <td colSpan={6} style={{background:'#f8fafc', padding:'1.25rem'}}>
                          {loadingDetail ? (
                            <div style={{color:'var(--muted)'}}>Loading...</div>
                          ) : detail ? (
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                              {/* Course progress */}
                              <div>
                                <div style={{fontWeight:600, marginBottom:'0.75rem', fontSize:'0.9rem'}}>Course progress</div>
                                {detail.progress.length === 0 ? <p style={{color:'var(--muted)', fontSize:'0.85rem'}}>No progress yet</p> : detail.progress.map(p => (
                                  <div key={p._id} style={{marginBottom:'0.75rem'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', marginBottom:'0.3rem'}}>
                                      <span>{p.courseId?.title || 'Course'}</span>
                                      <span>{p.completionPct}%</span>
                                    </div>
                                    <div className="progress-bar-wrap">
                                      <div className="progress-bar" style={{width:`${p.completionPct}%`}} />
                                    </div>
                                    {p.bestQuizScore > 0 && (
                                      <div style={{fontSize:'0.78rem', color:'var(--muted)', marginTop:'0.2rem'}}>Best quiz: {p.bestQuizScore}%</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {/* Recent sessions */}
                              <div>
                                <div style={{fontWeight:600, marginBottom:'0.75rem', fontSize:'0.9rem'}}>Recent sessions</div>
                                <div className="activity-log">
                                  {detail.sessions.slice(0,6).map(sess => (
                                    <div className="activity-item" key={sess._id}>
                                      <div className="activity-dot" />
                                      <div>
                                        <div style={{fontSize:'0.85rem'}}>{sess.courseId?.title || 'Course'}</div>
                                        <div className="activity-time">
                                          {new Date(sess.startTime).toLocaleString('en-IN')} · {Math.round((sess.durationMs||0)/60000)} min
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {detail.sessions.length === 0 && <p style={{fontSize:'0.85rem', color:'var(--muted)'}}>No sessions yet</p>}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
