import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Gamepad2, Search, Timer, Trophy } from 'lucide-react';
import { api } from '../../../api';
import config from '../../../config';

const ACTIVITIES = [
  { name: 'algebra_by', title: 'Table Memory', category: 'Math', icon: 'x', desc: 'Multiplication tables game' },
  { name: 'algebra_plus', title: 'Addition', category: 'Math', icon: '+', desc: 'Practice addition skills' },
  { name: 'algebra_minus', title: 'Subtraction', category: 'Math', icon: '-', desc: 'Practice subtraction' },
  { name: 'algebra_div', title: 'Division', category: 'Math', icon: '/', desc: 'Division practice' },
  { name: 'clockgame', title: 'Read the Clock', category: 'Math', icon: '12', desc: 'Learn to tell the time' },
  { name: 'money', title: 'Count Money', category: 'Math', icon: '$', desc: 'Count coins and notes' },
  { name: 'wordsgame', title: 'Words Game', category: 'Reading', icon: 'Aa', desc: 'Type falling letters' },
  { name: 'hangman', title: 'Hangman', category: 'Reading', icon: 'Ab', desc: 'Guess the hidden word' },
  { name: 'geography', title: 'World Geography', category: 'Science', icon: 'Geo', desc: 'Place countries on a map' },
  { name: 'canal_lock', title: 'Canal Lock', category: 'Science', icon: 'H2O', desc: 'Water level simulation' },
  { name: 'electric', title: 'Electricity', category: 'Science', icon: 'V', desc: 'Build electric circuits' },
  { name: 'memory', title: 'Memory Match', category: 'Brain', icon: 'M', desc: 'Flip and match cards' },
  { name: 'simon_says', title: 'Simon Says', category: 'Brain', icon: 'S', desc: 'Repeat the sequence' },
  { name: 'chess', title: 'Chess', category: 'Strategy', icon: 'Ch', desc: 'Classic chess game' },
  { name: 'sudoku', title: 'Sudoku', category: 'Strategy', icon: '9', desc: 'Fill the number grid' },
  { name: 'connect4', title: 'Connect 4', category: 'Strategy', icon: '4', desc: 'Four in a row game' },
  { name: 'drawing', title: 'Drawing', category: 'Creative', icon: 'Art', desc: 'Free drawing canvas' },
];

const makeSessionId = () =>
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const formatElapsed = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function GComprisRunningOverlay({ activity, sessionId, onClose }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const poll = window.setInterval(async () => {
      try {
        await api.get(`/api/gcompris/latest/${sessionId}`);
        onClose();
      } catch (error) {
        // The helper posts a result only after GCompris closes.
      }
    }, 3000);

    return () => window.clearInterval(poll);
  }, [onClose, sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-black text-indigo-700">
          {activity.icon}
        </div>
        <h2 className="text-2xl font-black text-slate-950">{activity.title} is running</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          GCompris opened on this computer. Play the activity, then close GCompris when finished.
        </p>
        <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-full bg-indigo-50 px-5 py-3 text-indigo-700">
          <Timer size={20} />
          <span className="font-mono text-2xl font-black tracking-widest">{formatElapsed(elapsed)}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-xl border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Back to games
        </button>
      </div>
    </div>
  );
}

export default function GComprisLauncher({ onBack, onActivityOpened }) {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [wallet, setWallet] = useState({ totalCoins: 0 });
  const [activeSession, setActiveSession] = useState(null);

  const loadProgress = useCallback(async () => {
    try {
      const [logsResponse, walletResponse] = await Promise.all([
        api.get('/api/gcompris/logs'),
        api.get('/api/gcompris/wallet'),
      ]);
      setLogs(Array.isArray(logsResponse.data) ? logsResponse.data : []);
      setWallet(walletResponse.data || { totalCoins: 0 });
    } catch (error) {
      setLogs([]);
      setWallet({ totalCoins: 0 });
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(ACTIVITIES.map((activity) => activity.category)))],
    []
  );
  const playedActivities = useMemo(
    () => new Set(logs.map((log) => log.activityName)),
    [logs]
  );
  const activityLevels = useMemo(() => {
    return logs.reduce((levels, log) => {
      const level = Number(log.level) || 1;
      const previousLevel = levels[log.activityName] || 1;
      return {
        ...levels,
        [log.activityName]: Math.max(previousLevel, level),
      };
    }, {});
  }, [logs]);
  const filteredActivities = ACTIVITIES.filter((activity) => {
    const matchesCategory = filter === 'All' || activity.category === filter;
    const matchesQuery = [activity.title, activity.desc, activity.category]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase());

    return matchesCategory && matchesQuery;
  });

  const openActivity = (activity) => {
    const sessionId = makeSessionId();
    const token = localStorage.getItem('token') || '';
    const startLevel = activityLevels[activity.name] || 1;
    const params = new URLSearchParams({
      activity: activity.name,
      startLevel: String(startLevel),
      sessionId,
      token,
      serverUrl: config.API_BASE_URL,
    });

    window.location.href = `edubridge://open?${params.toString()}`;
    setActiveSession({ activity, sessionId });
    onActivityOpened?.(activity);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      {activeSession && (
        <GComprisRunningOverlay
          activity={activeSession.activity}
          sessionId={activeSession.sessionId}
          onClose={() => {
            setActiveSession(null);
            loadProgress();
          }}
        />
      )}

      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Computer Apps
        </button>

        <div className="mb-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-7 text-white shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
                <Gamepad2 size={16} />
                GCompris
              </div>
              <h1 className="text-3xl font-black">Learning Games</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
                Open GCompris activities from Computer Apps. The local EduBridge helper must be installed on this PC.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <Trophy size={24} />
                <div>
                  <div className="text-2xl font-black">{wallet.totalCoins || 0}</div>
                  <div className="text-xs font-bold uppercase tracking-wide text-blue-100">Game coins</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          First time on this computer? Run the EduBridge registration from the POC once as administrator, and make sure GCompris is installed.
        </div>

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setFilter(category)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  filter === category
                    ? 'bg-indigo-600 text-white shadow'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search games"
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredActivities.map((activity) => {
            const played = playedActivities.has(activity.name);
            const level = activityLevels[activity.name] || 1;

            return (
              <div
                key={activity.name}
                className="flex min-h-[220px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-base font-black text-indigo-700">
                    {activity.icon}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${
                    played ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {played ? `Level ${level}` : activity.category}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-950">{activity.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{activity.desc}</p>
                <button
                  type="button"
                  onClick={() => openActivity(activity)}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
                >
                  <Gamepad2 size={18} />
                  Open GCompris
                </button>
              </div>
            );
          })}
        </div>

        {logs.length > 0 && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-black text-slate-950">Recent game activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-3">Game</th>
                    <th className="border-b border-slate-200 px-3 py-3">Level</th>
                    <th className="border-b border-slate-200 px-3 py-3">Score</th>
                    <th className="border-b border-slate-200 px-3 py-3">Coins</th>
                    <th className="border-b border-slate-200 px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 10).map((log) => (
                    <tr key={log._id || `${log.activityName}-${log.createdAt}`}>
                      <td className="border-b border-slate-100 px-3 py-3 font-bold text-slate-900">
                        {log.activityTitle || log.activityName}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">Level {log.level || 1}</td>
                      <td className="border-b border-slate-100 px-3 py-3">{log.score || 0}%</td>
                      <td className="border-b border-slate-100 px-3 py-3 font-bold text-amber-700">
                        {log.coinsAwarded ? `+${log.coinsAwarded}` : '-'}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-500">
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-IN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
