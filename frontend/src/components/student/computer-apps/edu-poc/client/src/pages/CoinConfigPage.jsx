// client/src/pages/CoinConfigPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const ACTIVITIES = [
  'algebra_by', 'algebra_plus', 'algebra_minus',
  'wordsgame', 'memory', 'chess', 'geography',
  'canal_lock', 'clockgame', 'sudoku'
];

export default function CoinConfigPage() {
  const [configs,  setConfigs]  = useState([]);
  const [form,     setForm]     = useState({ activityName: 'algebra_by', activityTitle: '', level: 1, coins: 10 });
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  const load = () => api.get('/coin-config').then(r => setConfigs(r.data));
  useEffect(() => { load(); }, []);

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/coin-config', form);
      setMsg('Saved!');
      load();
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/coin-config/${id}`);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Coin configuration</h1>
        <p>Set how many coins students earn per game and level</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'340px 1fr', gap:'1.5rem', alignItems:'start'}}>
        {/* Add rule form */}
        <div className="card">
          <div className="section-title">Add / update rule</div>
          {msg && <div className={`alert ${msg==='Saved!' ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Activity (game name)</label>
              <select className="form-control" value={form.activityName}
                onChange={e => setForm(f => ({...f, activityName: e.target.value}))}>
                {ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Display title (optional)</label>
              <input className="form-control" value={form.activityTitle}
                placeholder="e.g. Table Memory"
                onChange={e => setForm(f => ({...f, activityTitle: e.target.value}))} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div className="form-group">
                <label>Level</label>
                <input className="form-control" type="number" min="1" max="20"
                  value={form.level}
                  onChange={e => setForm(f => ({...f, level: +e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Coins to award 🪙</label>
                <input className="form-control" type="number" min="0"
                  value={form.coins}
                  onChange={e => setForm(f => ({...f, coins: +e.target.value}))} />
              </div>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save rule'}
            </button>
          </form>
        </div>

        {/* Existing rules */}
        <div className="card">
          <div className="section-title">Current rules ({configs.length})</div>
          {configs.length === 0 ? (
            <div className="empty-state"><p>No rules yet — add one on the left</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Game</th><th>Level</th><th>Coins</th><th></th></tr>
                </thead>
                <tbody>
                  {configs.map(c => (
                    <tr key={c._id}>
                      <td>
                        <div style={{fontWeight:500}}>{c.activityTitle || c.activityName}</div>
                        <div style={{fontSize:'0.78rem', color:'var(--muted)'}}>{c.activityName}</div>
                      </td>
                      <td>Level {c.level}</td>
                      <td style={{color:'#854F0B', fontWeight:600}}>{c.coins} 🪙</td>
                      <td>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(c._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}