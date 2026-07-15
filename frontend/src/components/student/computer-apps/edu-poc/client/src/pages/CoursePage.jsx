import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function CoursePage() {
  const { courseId } = useParams();
  const [course,   setCourse]   = useState(null);
  const [progress, setProgress] = useState({ completedLessons: [], completionPct: 0, quizAttempts: [] });
  const [timeData, setTimeData] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, pRes, sRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/progress/${courseId}`),
          api.get('/sessions/summary')
        ]);
        setCourse(cRes.data);
        setProgress(pRes.data || { completedLessons: [], completionPct: 0, quizAttempts: [] });
        const t = sRes.data.find(s => s.courseId === courseId);
        setTimeData(t || null);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [courseId]);

  if (loading) return <div className="loading-screen">Loading course...</div>;
  if (!course)  return <div className="page"><p>Course not found.</p></div>;

  const completedIds = (progress.completedLessons || []).map(String);
  const bestScore    = progress.bestQuizScore || 0;
  const attempts     = progress.quizAttempts?.length || 0;

  return (
    <div className="page">
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>

      <div className="page-header">
        <div style={{display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap'}}>
          <h1>{course.title}</h1>
          {course.category && <span className="badge badge-primary">{course.category}</span>}
        </div>
        <p>{course.description}</p>
      </div>

      {/* Progress summary bar */}
      <div className="card" style={{marginBottom:'1.5rem'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem', flexWrap:'wrap', gap:'0.5rem'}}>
          <span className="section-title" style={{margin:0}}>Your progress</span>
          <div style={{display:'flex', gap:'1rem', fontSize:'0.85rem', color:'var(--muted)'}}>
            <span>⏱ {timeData ? `${timeData.totalMin} min spent` : '0 min spent'}</span>
            <span>✅ {completedIds.length}/{course.lessons.length} lessons</span>
            {attempts > 0 && <span>🎯 Best quiz score: {bestScore}%</span>}
          </div>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar" style={{width:`${progress.completionPct || 0}%`}} />
        </div>
        <div className="progress-label">
          <span>{progress.completionPct === 100 ? '🎉 Course completed!' : `${progress.completionPct || 0}% complete`}</span>
          <span>{progress.completionPct || 0}%</span>
        </div>
      </div>

      {/* Lessons */}
      <div className="section-title">Lessons ({course.lessons.length})</div>
      <div className="lesson-list" style={{marginBottom:'1.5rem'}}>
        {course.lessons
          .sort((a, b) => a.order - b.order)
          .map((lesson, idx) => {
            const done = completedIds.includes(String(lesson._id));
            return (
              <Link
                to={`/courses/${courseId}/lesson/${lesson._id}`}
                className={`lesson-item ${done ? 'completed' : ''}`}
                key={lesson._id}
              >
                <div className={`lesson-check ${done ? 'done' : ''}`}>
                  {done ? '✓' : idx + 1}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500}}>{lesson.title}</div>
                  <div style={{fontSize:'0.8rem', color:'var(--muted)'}}>~{lesson.readTimeMinutes} min read</div>
                </div>
                {done && <span className="badge badge-success">Done</span>}
              </Link>
            );
          })}
      </div>

      {/* Quiz section */}
      {course.quiz?.questions?.length > 0 && (
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div className="section-title" style={{margin:0}}>Course Quiz</div>
              <div style={{fontSize:'0.85rem', color:'var(--muted)', marginTop:'0.25rem'}}>
                {course.quiz.questions.length} questions · Pass mark: {course.quiz.passMark}%
                {attempts > 0 && ` · ${attempts} attempt${attempts>1?'s':''}`}
              </div>
            </div>
            <Link to={`/courses/${courseId}/quiz`} className="btn btn-primary">
              {attempts > 0 ? 'Retake Quiz' : 'Start Quiz'}
            </Link>
          </div>
          {attempts > 0 && (
            <div style={{marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--border)', fontSize:'0.85rem', color:'var(--muted)'}}>
              Best score: <strong style={{color: bestScore >= course.quiz.passMark ? 'var(--success)' : 'var(--danger)'}}>{bestScore}%</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
