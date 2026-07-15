import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useTimer from '../hooks/useTimer';

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course,    setCourse]    = useState(null);
  const [lesson,    setLesson]    = useState(null);
  const [progress,  setProgress]  = useState(null);
  const [marking,   setMarking]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [elapsed,   setElapsed]   = useState(0);  // seconds on-screen

  // Start/stop backend session automatically
  useTimer(courseId, lessonId);

  // Live elapsed timer (display only)
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/progress/${courseId}`)
        ]);
        const c = cRes.data;
        const l = c.lessons.find(l => l._id === lessonId);
        setCourse(c);
        setLesson(l);
        const completed = (pRes.data?.completedLessons || []).map(String);
        setDone(completed.includes(lessonId));
        setProgress(pRes.data);
      } catch (err) { console.error(err); }
    };
    load();
  }, [courseId, lessonId]);

  const markComplete = async () => {
    if (done || marking) return;
    setMarking(true);
    try {
      await api.post(`/progress/${courseId}/lesson/${lessonId}`);
      setDone(true);
    } catch (err) { console.error(err); }
    finally { setMarking(false); }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // Navigate to next lesson
  const goNext = () => {
    if (!course) return;
    const sorted  = [...course.lessons].sort((a, b) => a.order - b.order);
    const idx     = sorted.findIndex(l => l._id === lessonId);
    const nextL   = sorted[idx + 1];
    if (nextL) navigate(`/courses/${courseId}/lesson/${nextL._id}`);
    else if (course.quiz?.questions?.length) navigate(`/courses/${courseId}/quiz`);
    else navigate(`/courses/${courseId}`);
  };

  if (!lesson) return <div className="loading-screen">Loading lesson...</div>;

  return (
    <div className="page" style={{maxWidth:760}}>
      <Link to={`/courses/${courseId}`} className="back-link">← Back to course</Link>

      <div className="page-header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.75rem'}}>
          <h1 style={{fontSize:'1.4rem'}}>{lesson.title}</h1>
          <div className="timer-badge">
            <div className="timer-dot" />
            {formatTime(elapsed)}
          </div>
        </div>
        <div style={{fontSize:'0.85rem', color:'var(--muted)', marginTop:'0.3rem'}}>
          ~{lesson.readTimeMinutes} min read · {course?.title}
        </div>
      </div>

      {/* Reading content */}
      <div className="card" style={{marginBottom:'1.5rem'}}>
        <div className="reading-content"
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      </div>

      {/* Actions */}
      <div style={{display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap'}}>
        {!done ? (
          <button className="btn btn-primary" onClick={markComplete} disabled={marking}>
            {marking ? 'Saving...' : '✓ Mark as complete'}
          </button>
        ) : (
          <span className="badge badge-success" style={{fontSize:'0.88rem', padding:'0.4rem 0.8rem'}}>✓ Completed</span>
        )}
        <button className="btn btn-outline" onClick={goNext}>
          Next →
        </button>
      </div>
    </div>
  );
}
