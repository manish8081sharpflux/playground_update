import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function QuizPage() {
  const { courseId } = useParams();
  const [course,    setCourse]    = useState(null);
  const [answers,   setAnswers]   = useState({});     // { questionIndex: selectedIndex }
  const [submitted, setSubmitted] = useState(false);
  const [result,    setResult]    = useState(null);
  const [elapsed,   setElapsed]   = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [submitting,setSubmitting]= useState(false);

  useEffect(() => {
    api.get(`/courses/${courseId}`)
      .then(r => setCourse(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const formatTime = s => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2,'0')}`;
  };

  const handleSelect = (qIdx, oIdx) => {
    if (submitted) return;
    setAnswers(a => ({ ...a, [qIdx]: oIdx }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    const questions = course.quiz.questions;
    const payload   = questions.map((_, qi) => ({ questionIndex: qi, selectedIndex: answers[qi] ?? -1 }));
    setSubmitting(true);
    try {
      const { data } = await api.post(`/progress/${courseId}/quiz`, { answers: payload });
      setResult(data);
      setSubmitted(true);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }, [course, answers, courseId, submitting]);

  if (loading) return <div className="loading-screen">Loading quiz...</div>;
  if (!course?.quiz?.questions?.length) return <div className="page"><p>No quiz found.</p></div>;

  const { questions, passMark, title: quizTitle } = course.quiz;
  const answeredCount = Object.keys(answers).length;

  // Results screen
  if (submitted && result) {
    const passed = result.passed;
    return (
      <div className="page" style={{maxWidth:680}}>
        <Link to={`/courses/${courseId}`} className="back-link">← Back to course</Link>
        <div className="card">
          <div className="quiz-result">
            <div style={{fontSize:'2rem', marginBottom:'0.5rem'}}>{passed ? '🎉' : '📖'}</div>
            <div className={`quiz-score ${passed ? 'pass' : 'fail'}`}>{result.score}%</div>
            <div style={{fontSize:'1rem', color:'var(--muted)', margin:'0.5rem 0 1.5rem'}}>
              {result.correct} / {result.total} correct · Time: {formatTime(elapsed)}
            </div>
            <span className={`badge ${passed ? 'badge-success' : 'badge-warning'}`} style={{fontSize:'0.9rem', padding:'0.4rem 1rem'}}>
              {passed ? `Passed ✓ (pass mark: ${passMark}%)` : `Not passed (pass mark: ${passMark}%)`}
            </span>
          </div>

          <hr className="divider" />

          {/* Answer review */}
          <div className="section-title">Answer review</div>
          {questions.map((q, qi) => {
            const graded = result.gradedAnswers[qi];
            return (
              <div className="quiz-question" key={qi}>
                <h3>{qi + 1}. {q.text}</h3>
                {q.options.map((opt, oi) => {
                  let cls = 'quiz-option';
                  if (oi === q.correctIndex) cls += ' correct';
                  else if (oi === graded?.selectedIndex && !graded?.correct) cls += ' wrong';
                  return (
                    <div className={cls} key={oi}>
                      <span style={{minWidth:22, height:22, border:'2px solid var(--border)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem'}}>
                        {oi === q.correctIndex ? '✓' : oi === graded?.selectedIndex ? '✗' : String.fromCharCode(65+oi)}
                      </span>
                      {opt}
                    </div>
                  );
                })}
                {q.explanation && (
                  <div style={{marginTop:'0.5rem', fontSize:'0.85rem', color:'var(--muted)', background:'#f8fafc', padding:'0.6rem 0.8rem', borderRadius:6}}>
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz taking screen
  return (
    <div className="page" style={{maxWidth:680}}>
      <Link to={`/courses/${courseId}`} className="back-link">← Back to course</Link>

      <div className="page-header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem'}}>
          <h1 style={{fontSize:'1.3rem'}}>{quizTitle || 'Course Quiz'}</h1>
          <div style={{display:'flex', gap:'0.75rem', alignItems:'center'}}>
            <span style={{fontSize:'0.85rem', color:'var(--muted)'}}>{answeredCount}/{questions.length} answered</span>
            <div className="timer-badge"><div className="timer-dot" />{formatTime(elapsed)}</div>
          </div>
        </div>
        <p>Pass mark: {passMark}% · {questions.length} questions</p>
      </div>

      <div className="card">
        {questions.map((q, qi) => (
          <div className="quiz-question" key={qi}>
            <h3>{qi + 1}. {q.text}</h3>
            {q.options.map((opt, oi) => (
              <div
                className={`quiz-option${answers[qi] === oi ? ' selected' : ''}`}
                key={oi}
                onClick={() => handleSelect(qi, oi)}
              >
                <span style={{minWidth:22, height:22, border:'2px solid var(--border)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', background: answers[qi]===oi ? 'var(--primary)' : 'transparent', color: answers[qi]===oi ? '#fff' : 'inherit', borderColor: answers[qi]===oi ? 'var(--primary)' : 'var(--border)'}}>
                  {String.fromCharCode(65 + oi)}
                </span>
                {opt}
              </div>
            ))}
          </div>
        ))}

        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={submitting || answeredCount === 0}
        >
          {submitting ? 'Submitting...' : `Submit Quiz (${answeredCount}/${questions.length} answered)`}
        </button>
      </div>
    </div>
  );
}
