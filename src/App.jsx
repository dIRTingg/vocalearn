import { useState, useRef } from "react";

// ─── Spaced Repetition (SM-2) ────────────────────────────────────────────────
const SM2 = (card, quality) => {
  let { easeFactor = 2.5, interval = 1, repetitions = 0 } = card;
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else { repetitions = 0; interval = 1; }
  return { easeFactor, interval, repetitions, nextReview: Date.now() + interval * 86400000 };
};
const isDue = (c) => !c.nextReview || c.nextReview <= Date.now();
const uid = () => Date.now() + Math.random();

const starterCards = [
  { id: 1, english: "apple", german: "Apfel", emoji: "🍎", easeFactor: 2.5, interval: 1, repetitions: 0 },
  { id: 2, english: "dog", german: "Hund", emoji: "🐶", easeFactor: 2.5, interval: 1, repetitions: 0 },
  { id: 3, english: "house", german: "Haus", emoji: "🏠", easeFactor: 2.5, interval: 1, repetitions: 0 },
  { id: 4, english: "sun", german: "Sonne", emoji: "☀️", easeFactor: 2.5, interval: 1, repetitions: 0 },
];

// ─── Quiz helpers ─────────────────────────────────────────────────────────────
const buildRounds = (cards) => {
  const total = Math.min(cards.length, 8);
  return [...cards].sort(() => Math.random() - .5).slice(0, total).map(current => ({
    current,
    options: [...cards.filter(c => c.id !== current.id).sort(() => Math.random() - .5).slice(0, 3), current].sort(() => Math.random() - .5),
  }));
};

const isExact = (input, answer) => input.trim().toLowerCase() === answer.trim().toLowerCase();

const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
};

const isCloseTypo = (input, answer) => {
  const a = input.trim().toLowerCase(), b = answer.trim().toLowerCase();
  if (a === b) return false;
  if (b.length < 4) return false;
  return levenshtein(a, b) <= 2;
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #f4f6fb; min-height: 100vh; }

  :root {
    --accent: #5b6af0;
    --accent-light: #eef0fe;
    --accent-dark: #3d4bcc;
    --green: #22c55e;
    --green-light: #dcfce7;
    --red: #ef4444;
    --red-light: #fee2e2;
    --amber: #f59e0b;
    --amber-light: #fef3c7;
    --text: #1a1d2e;
    --text-2: #6b7280;
    --border: #e5e7eb;
    --surface: #ffffff;
    --bg: #f4f6fb;
    --radius: 16px;
    --radius-sm: 10px;
    --shadow: 0 4px 24px rgba(0,0,0,0.07);
    --shadow-sm: 0 1px 6px rgba(0,0,0,0.06);
  }

  .app { max-width: 480px; margin: 0 auto; padding: 0 0 90px; min-height: 100vh; }

  .nav {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--surface); border-top: 1px solid var(--border);
    display: flex; justify-content: space-around;
    padding: 10px 0 18px; z-index: 100;
    box-shadow: 0 -2px 16px rgba(0,0,0,0.05);
  }
  .nav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
    color: var(--text-2); padding: 6px 14px; border-radius: 12px; transition: all .18s;
  }
  .nav-btn.active { color: var(--accent); background: var(--accent-light); }
  .nav-btn .icon { font-size: 22px; }

  .header {
    background: var(--accent); padding: 52px 24px 28px;
    position: relative; overflow: hidden;
  }
  .header::before {
    content: ''; position: absolute; top: -40px; right: -40px;
    width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,0.08);
  }
  .header::after {
    content: ''; position: absolute; bottom: -20px; left: 30px;
    width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.05);
  }
  .header h1 {
    font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
    color: white; letter-spacing: -.3px; position: relative; z-index: 1;
  }
  .header p { font-size: 13px; color: rgba(255,255,255,.7); margin-top: 2px; position: relative; z-index: 1; }

  .stats-row { display: flex; gap: 10px; padding: 16px 16px 0; }
  .stat-card {
    flex: 1; background: var(--surface); border-radius: var(--radius);
    padding: 14px 10px; text-align: center; box-shadow: var(--shadow-sm); border: 1px solid var(--border);
  }
  .stat-card .num { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; line-height: 1; }
  .stat-card .lbl { font-size: 10px; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: .6px; margin-top: 3px; }

  .section { padding: 18px 16px 0; }
  .section-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: var(--text); margin-bottom: 12px; letter-spacing: -.2px; }

  .flashcard-wrap { perspective: 1000px; height: 210px; cursor: pointer; margin-bottom: 12px; }
  .flashcard-inner { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform .45s cubic-bezier(.4,0,.2,1); }
  .flashcard-inner.flipped { transform: rotateY(180deg); }
  .flashcard-face {
    position: absolute; inset: 0; backface-visibility: hidden; border-radius: var(--radius);
    display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; box-shadow: var(--shadow);
  }
  .flashcard-front { background: var(--accent); color: white; }
  .flashcard-back { background: #1a1d2e; color: white; transform: rotateY(180deg); }
  .flashcard-emoji { font-size: 48px; margin-bottom: 8px; }
  .flashcard-word { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; }
  .flashcard-hint { font-size: 12px; opacity: .6; margin-top: 8px; font-weight: 500; }

  .card-nav { display: flex; align-items: center; justify-content: space-between; }
  .card-counter { font-size: 13px; font-weight: 600; color: var(--text-2); }

  .btn {
    border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 600;
    border-radius: var(--radius-sm); padding: 11px 20px; font-size: 14px; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn:active { transform: scale(.97); }
  .btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover:not(:disabled) { background: var(--accent-dark); }
  .btn-secondary { background: var(--accent-light); color: var(--accent); }
  .btn-ghost { background: var(--surface); color: var(--text-2); border: 1px solid var(--border); }
  .btn-ghost:hover:not(:disabled) { background: #f9fafb; }
  .btn-success { background: var(--green); color: white; }
  .btn-danger { background: var(--red); color: white; }
  .btn-sm { padding: 7px 13px; font-size: 12px; border-radius: 8px; }
  .btn-icon { background: var(--surface); border: 1px solid var(--border); border-radius: 50%; width: 40px; height: 40px; padding: 0; justify-content: center; font-size: 16px; box-shadow: var(--shadow-sm); }

  .rating-row { display: flex; gap: 8px; margin-top: 12px; }
  .rating-row .btn { flex: 1; justify-content: center; font-size: 13px; }

  .quiz-card {
    background: var(--surface); border-radius: var(--radius); padding: 28px 20px;
    text-align: center; box-shadow: var(--shadow); border: 1px solid var(--border);
  }
  .quiz-card .q-emoji { font-size: 56px; margin-bottom: 8px; }
  .quiz-card .q-word { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; color: var(--accent); letter-spacing: -.5px; }
  .quiz-card .q-sub { font-size: 13px; color: var(--text-2); margin-top: 6px; font-weight: 500; }

  .progress-bar-wrap { background: var(--border); border-radius: 99px; height: 6px; overflow: hidden; margin-bottom: 14px; }
  .progress-bar-fill { height: 100%; background: var(--accent); border-radius: 99px; transition: width .4s; }

  .quiz-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
  .quiz-opt {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    padding: 14px 10px; font-family: 'DM Sans', sans-serif; font-weight: 600;
    font-size: 15px; cursor: pointer; transition: all .15s; text-align: center; color: var(--text);
  }
  .quiz-opt:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-light); color: var(--accent); }
  .quiz-opt.correct { border-color: var(--green); background: var(--green-light); color: #166534; }
  .quiz-opt.wrong { border-color: var(--red); background: var(--red-light); color: #991b1b; }
  .quiz-opt:disabled { cursor: default; }

  .answer-input {
    width: 100%; border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    padding: 13px 16px; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 600;
    outline: none; transition: all .2s; color: var(--text); background: var(--surface);
  }
  .answer-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(91,106,240,.1); }
  .answer-input.s-correct { border-color: var(--green); background: var(--green-light); color: #166534; }
  .answer-input.s-wrong   { border-color: var(--red);   background: var(--red-light);   color: #991b1b; }
  .answer-input.s-typo    { border-color: var(--amber); background: var(--amber-light);  color: #92400e; }

  .feedback {
    margin-top: 10px; padding: 11px 14px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 600; display: flex; align-items: flex-start; gap: 8px; line-height: 1.45;
  }
  .feedback.correct { background: var(--green-light); color: #166534; }
  .feedback.wrong   { background: var(--red-light);   color: #991b1b; }
  .feedback.typo    { background: var(--amber-light);  color: #92400e; }

  .hint-toggle {
    width: 100%; padding: 10px; background: none; border: 1.5px dashed var(--border);
    border-radius: var(--radius-sm); cursor: pointer; font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 600; color: var(--text-2);
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: all .15s; margin-top: 10px;
  }
  .hint-toggle:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }

  .vocab-list { display: flex; flex-direction: column; gap: 8px; }
  .vocab-item {
    background: var(--surface); border-radius: var(--radius-sm); padding: 12px 14px;
    display: flex; align-items: center; gap: 12px; border: 1px solid var(--border); box-shadow: var(--shadow-sm);
  }
  .vocab-item .v-emoji { font-size: 26px; }
  .vocab-item .v-words { flex: 1; }
  .vocab-item .v-en { font-weight: 700; font-size: 15px; color: var(--text); }
  .vocab-item .v-de { font-size: 12px; color: var(--text-2); margin-top: 1px; }

  .pill { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 3px 8px; border-radius: 99px; }
  .pill-due { background: var(--amber-light); color: #92400e; }
  .pill-ok  { background: var(--green-light); color: #166534; }

  .progress-card {
    background: var(--surface); border-radius: var(--radius); padding: 18px;
    border: 1px solid var(--border); box-shadow: var(--shadow-sm); margin-bottom: 12px;
  }
  .progress-label { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; margin-bottom: 8px; }
  .prog-track { background: var(--border); border-radius: 99px; height: 8px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 99px; background: var(--accent); transition: width .5s; }

  .add-card { background: var(--surface); border-radius: var(--radius); padding: 18px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
  .form-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .form-input {
    flex: 1; border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    padding: 11px 13px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    outline: none; color: var(--text); transition: border-color .15s;
  }
  .form-input:focus { border-color: var(--accent); }
  .emoji-input { width: 60px; flex: none; text-align: center; font-size: 18px; }
  .form-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-2); margin-bottom: 5px; }

  .photo-drop {
    border: 2px dashed var(--border); border-radius: var(--radius); padding: 36px 20px;
    text-align: center; cursor: pointer; background: #fafbff; transition: all .2s;
  }
  .photo-drop:hover { border-color: var(--accent); background: var(--accent-light); }
  .photo-drop .ph-icon { font-size: 36px; margin-bottom: 10px; }
  .photo-drop p { font-weight: 600; color: var(--text-2); font-size: 13px; }

  .ai-list { display: flex; flex-direction: column; gap: 8px; }
  .ai-item {
    background: #fafbff; border-radius: var(--radius-sm); padding: 11px 13px;
    display: flex; align-items: center; gap: 10px; border: 1px solid var(--border);
  }
  .ai-item .ai-en { font-weight: 700; font-size: 14px; }
  .ai-item .ai-de { font-size: 12px; color: var(--text-2); }

  .tabs { display: flex; gap: 4px; margin-bottom: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px; }
  .tab { flex: 1; padding: 9px; border-radius: 8px; border: none; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; transition: all .15s; background: none; color: var(--text-2); }
  .tab.active { background: var(--accent); color: white; }

  .spinner { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite; vertical-align: middle; margin-right: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: var(--text); color: white; padding: 10px 22px; border-radius: 99px; font-weight: 600; font-size: 13px; z-index: 999; animation: fadeUp .25s ease, fadeOut .3s 2.2s forwards; white-space: nowrap; }
  @keyframes fadeUp { from { opacity:0; top:10px } to { opacity:1; top:20px } }
  @keyframes fadeOut { to { opacity:0; top:10px } }

  .empty-state { text-align: center; padding: 48px 24px; color: var(--text-2); }
  .empty-state .e-icon { font-size: 48px; margin-bottom: 10px; }
  .empty-state p { font-weight: 600; font-size: 15px; }
`;

function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null;
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({ cards, onRate }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const due = cards.filter(isDue);
  const card = due[idx % Math.max(due.length, 1)];

  const next = (quality) => {
    onRate(card.id, quality);
    setFlipped(false); setShowRating(false);
    setIdx(i => (i + 1) % Math.max(due.length, 1));
  };

  if (!card) return (
    <div className="section">
      <div className="empty-state">
        <div className="e-icon">🎉</div>
        <p>Alle Vokabeln für heute erledigt!<br />Komm morgen wieder.</p>
      </div>
    </div>
  );

  return (
    <div className="section">
      <div className="section-title">
        Heute lernen{" "}
        <span style={{ fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>({due.length} fällig)</span>
      </div>

      <div className="flashcard-wrap" onClick={() => { setFlipped(f => !f); setShowRating(true); }}>
        <div className={`flashcard-inner${flipped ? " flipped" : ""}`}>
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-emoji">{card.emoji || "📖"}</div>
            <div className="flashcard-word">{card.english}</div>
            <div className="flashcard-hint">Tippen zum Umdrehen</div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-emoji">{card.emoji || "📖"}</div>
            <div className="flashcard-word">{card.german}</div>
            <div className="flashcard-hint">Wie gut wusstest du es?</div>
          </div>
        </div>
      </div>

      <div className="card-nav">
        <button className="btn btn-icon" onClick={() => { setFlipped(false); setShowRating(false); setIdx(i => Math.max(0, i - 1)); }}>←</button>
        <span className="card-counter">{(idx % due.length) + 1} / {due.length}</span>
        <button className="btn btn-icon" onClick={() => { setFlipped(false); setShowRating(false); setIdx(i => (i + 1) % due.length); }}>→</button>
      </div>

      {showRating && flipped && (
        <div className="rating-row">
          <button className="btn btn-danger btn-sm" onClick={() => next(1)}>Nochmal</button>
          <button className="btn btn-ghost btn-sm" onClick={() => next(3)}>Ging so</button>
          <button className="btn btn-success btn-sm" onClick={() => next(5)}>Gewusst!</button>
        </div>
      )}
    </div>
  );
}

// ─── QUIZ VIEW ────────────────────────────────────────────────────────────────
function QuizView({ cards }) {
  const [rounds, setRounds] = useState(() => buildRounds(cards));
  const [qIdx, setQIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [showMC, setShowMC] = useState(false);
  const [state, setState] = useState(null);
  const [mcSelected, setMcSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef();

  const total = rounds.length;
  const { current, options } = rounds[qIdx] || {};

  const goNext = (delay = 1500) => setTimeout(() => {
    if (qIdx + 1 >= total) setDone(true);
    else {
      setQIdx(i => i + 1);
      setTyped(""); setShowMC(false); setState(null); setMcSelected(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, delay);

  const submitTyped = () => {
    if (state || !typed.trim()) return;
    if (isExact(typed, current.german)) {
      setState("correct"); setScore(s => s + 1); goNext(1400);
    } else if (isCloseTypo(typed, current.german)) {
      // Typo: show warning, clear after 2s, let them try again — no point deducted yet
      setState("typo");
      setTimeout(() => { setState(null); setTyped(""); inputRef.current?.focus(); }, 2200);
    } else {
      setState("wrong"); goNext(1600);
    }
  };

  const handleMC = (opt) => {
    if (state) return;
    setMcSelected(opt.id);
    const correct = opt.id === current.id;
    setState(correct ? "mc-correct" : "mc-wrong");
    if (correct) setScore(s => s + 1);
    goNext(1400);
  };

  const restart = () => {
    setRounds(buildRounds(cards)); setQIdx(0); setTyped(""); setShowMC(false);
    setState(null); setMcSelected(null); setScore(0); setDone(false);
  };

  if (cards.length < 2) return (
    <div className="section"><div className="empty-state"><div className="e-icon">📝</div><p>Mindestens 2 Vokabeln zum Starten nötig.</p></div></div>
  );

  if (done) return (
    <div className="section">
      <div className="quiz-card" style={{ padding: "40px 24px" }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🏆</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>{score}/{total} richtig</div>
        <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
          {score === total ? "Perfekt – alle richtig!" : score >= total / 2 ? "Gut gemacht, weiter so!" : "Übe weiter – du schaffst das!"}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={restart}>Nochmal</button>
      </div>
    </div>
  );

  const answered = !!state && state !== "typo";
  const isRight = state === "correct" || state === "mc-correct";
  const isTypo = state === "typo";

  return (
    <div className="section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Frage {qIdx + 1} / {total}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>{score} ✓</span>
      </div>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${(qIdx / total) * 100}%` }} />
      </div>

      <div className="quiz-card">
        <div className="q-emoji">{current.emoji || "📖"}</div>
        <div className="q-word">{current.english}</div>
        <div className="q-sub">Übersetze ins Deutsche</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          ref={inputRef}
          className={`answer-input${isTypo ? " s-typo" : answered ? (isRight ? " s-correct" : " s-wrong") : ""}`}
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !answered && !isTypo && typed.trim() && submitTyped()}
          placeholder="Deutsche Übersetzung …"
          disabled={answered}
          autoFocus
        />
        <button
          className="btn btn-primary"
          disabled={answered || !typed.trim()}
          onClick={submitTyped}
          style={{ minWidth: 52, justifyContent: "center", fontSize: 18, borderRadius: "var(--radius-sm)" }}
        >→</button>
      </div>

      {(answered || isTypo) && (
        <div className={`feedback ${isTypo ? "typo" : isRight ? "correct" : "wrong"}`}>
          {isTypo && <>⚠️ Fast! Kleiner Tippfehler – die richtige Schreibweise ist „{current.german}". Versuch es nochmal!</>}
          {answered && isRight && <>✓ Richtig!</>}
          {answered && !isRight && <>✗ Falsch. Die richtige Übersetzung ist: <strong style={{ marginLeft: 3 }}>„{current.german}"</strong></>}
        </div>
      )}

      {!answered && !isTypo && (
        <button className="hint-toggle" onClick={() => setShowMC(s => !s)}>
          {showMC ? "Auswahl ausblenden" : "💡 Hilfe: Auswahl anzeigen"}
        </button>
      )}

      {showMC && !answered && !isTypo && (
        <div className="quiz-options">
          {options.map(opt => (
            <button key={opt.id} className="quiz-opt" onClick={() => handleMC(opt)}>
              {opt.emoji && <span style={{ fontSize: 17, display: "block", marginBottom: 2 }}>{opt.emoji}</span>}
              {opt.german}
            </button>
          ))}
        </div>
      )}

      {answered && (state === "mc-correct" || state === "mc-wrong") && (
        <div className="quiz-options">
          {options.map(opt => (
            <button key={opt.id} className={`quiz-opt${opt.id === current.id ? " correct" : opt.id === mcSelected ? " wrong" : ""}`} disabled>
              {opt.emoji && <span style={{ fontSize: 17, display: "block", marginBottom: 2 }}>{opt.emoji}</span>}
              {opt.german}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROGRESS VIEW ────────────────────────────────────────────────────────────
function ProgressView({ cards }) {
  const learned = cards.filter(c => c.repetitions >= 2).length;
  const due = cards.filter(isDue).length;
  const total = cards.length;

  return (
    <div className="section">
      <div className="stats-row" style={{ padding: 0, marginBottom: 14 }}>
        <div className="stat-card"><div className="num" style={{ color: "var(--accent)" }}>{total}</div><div className="lbl">Gesamt</div></div>
        <div className="stat-card"><div className="num" style={{ color: "var(--green)" }}>{learned}</div><div className="lbl">Gelernt</div></div>
        <div className="stat-card"><div className="num" style={{ color: "var(--amber)" }}>{due}</div><div className="lbl">Fällig</div></div>
      </div>
      <div className="progress-card">
        <div className="progress-label"><span>Lernfortschritt</span><span style={{ color: "var(--accent)" }}>{total ? Math.round(learned / total * 100) : 0}%</span></div>
        <div className="prog-track"><div className="prog-fill" style={{ width: `${total ? learned / total * 100 : 0}%` }} /></div>
      </div>
      <div className="section-title" style={{ marginTop: 4 }}>Alle Vokabeln</div>
      {cards.length === 0 && <div className="empty-state"><div className="e-icon">📭</div><p>Noch keine Vokabeln vorhanden.</p></div>}
      <div className="vocab-list">
        {cards.map(c => (
          <div key={c.id} className="vocab-item">
            <div className="v-emoji">{c.emoji || "📖"}</div>
            <div className="v-words"><div className="v-en">{c.english}</div><div className="v-de">{c.german}</div></div>
            <span className={`pill ${isDue(c) ? "pill-due" : "pill-ok"}`}>{isDue(c) ? "fällig" : "✓"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── IMAGE CROP SELECTOR ──────────────────────────────────────────────────────
function ImageCropSelector({ imageData, onCropReady }) {
  const imgRef = useRef();
  const [drag, setDrag] = useState(null);
  const [rect, setRect] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const rel = (e, el) => {
    const r = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: Math.max(0, Math.min(1, (cx - r.left) / r.width)), y: Math.max(0, Math.min(1, (cy - r.top) / r.height)) };
  };

  const onDown = (e) => { e.preventDefault(); const p = rel(e, imgRef.current); setDrag(p); setRect({ x: p.x, y: p.y, w: 0, h: 0 }); onCropReady(null); };
  const onMove = (e) => { if (!drag) return; e.preventDefault(); const p = rel(e, imgRef.current); setRect({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) }); };
  const onUp = () => {
    if (!drag || !rect) return; setDrag(null);
    if (rect.w < 0.02 || rect.h < 0.02) { setRect(null); return; }
    const img = imgRef.current;
    const sx = img.naturalWidth / img.width, sy = img.naturalHeight / img.height;
    const canvas = document.createElement("canvas");
    canvas.width = rect.w * img.width * sx; canvas.height = rect.h * img.height * sy;
    const ctx = canvas.getContext("2d");
    const fi = new Image();
    fi.onload = () => { ctx.drawImage(fi, rect.x * img.width * sx, rect.y * img.height * sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height); onCropReady(canvas.toDataURL("image/jpeg", 0.92)); };
    fi.src = imageData;
  };

  return (
    <div style={{ position: "relative", userSelect: "none", touchAction: "none", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", cursor: "crosshair" }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
    >
      <img ref={imgRef} src={imageData} alt="" draggable={false} onLoad={() => setLoaded(true)}
        style={{ display: "block", width: "100%", maxHeight: 320, objectFit: "contain", background: "#f0f0f0" }} />
      {loaded && !rect && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "8px 16px", color: "white", fontWeight: 600, fontSize: 13 }}>
            Bereich auswählen (ziehen)
          </div>
        </div>
      )}
      {rect && rect.w > 0.01 && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", pointerEvents: "none" }} />
          <div style={{
            position: "absolute", pointerEvents: "none", boxSizing: "border-box",
            left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`,
            border: "2px solid var(--accent)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)", background: "transparent",
          }} />
        </>
      )}
    </div>
  );
}

// ─── ADD VIEW ─────────────────────────────────────────────────────────────────
function AddView({ cards, setCards, showToast }) {
  const [tab, setTab] = useState("manual");
  const [en, setEn] = useState(""); const [de, setDe] = useState(""); const [emoji, setEmoji] = useState("📖");
  const [imageData, setImageData] = useState(null);
  const [croppedData, setCroppedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const fileRef = useRef();

  const addManual = () => {
    if (!en.trim() || !de.trim()) return;
    setCards(cs => [...cs, { id: uid(), english: en.trim(), german: de.trim(), emoji, easeFactor: 2.5, interval: 1, repetitions: 0 }]);
    setEn(""); setDe(""); setEmoji("📖");
    showToast("Vokabel hinzugefügt");
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setImageData(ev.target.result); setCroppedData(null); setAiResults([]); };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async () => {
    const source = croppedData || imageData; if (!source) return;
    setLoading(true);
    try {
      // API-Aufruf geht an die eigene Vercel Serverless Function (/api/analyze)
      // Der Anthropic-Key bleibt serverseitig – er ist im Browser NICHT sichtbar
      const imageBase64 = source.split(",")[1];
      const mediaType = source.split(";")[0].split(":")[1];
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType }),
      });
      if (res.status === 429) { showToast("⚠️ Zu viele Anfragen – bitte warte etwas."); setLoading(false); return; }
      if (!res.ok) { showToast("Fehler bei der KI-Analyse"); setLoading(false); return; }
      const data = await res.json();
      setAiResults(data.vocab);
    } catch { showToast("Fehler bei der KI-Analyse"); }
    setLoading(false);
  };

  const addAiResult = (r) => {
    if (cards.find(c => c.english.toLowerCase() === r.english.toLowerCase())) { showToast("Bereits vorhanden"); return; }
    setCards(cs => [...cs, { id: uid(), english: r.english, german: r.german, emoji: r.emoji || "📖", easeFactor: 2.5, interval: 1, repetitions: 0 }]);
    setAiResults(rs => rs.filter(x => x.english !== r.english));
    showToast("Hinzugefügt");
  };

  const addAllAi = () => {
    let added = 0;
    aiResults.forEach(r => {
      if (!cards.find(c => c.english.toLowerCase() === r.english.toLowerCase())) {
        setCards(cs => [...cs, { id: uid(), english: r.english, german: r.german, emoji: r.emoji || "📖", easeFactor: 2.5, interval: 1, repetitions: 0 }]);
        added++;
      }
    });
    setAiResults([]); showToast(`${added} Vokabeln hinzugefügt`);
  };

  return (
    <div className="section">
      <div className="tabs">
        <button className={`tab${tab === "manual" ? " active" : ""}`} onClick={() => setTab("manual")}>✏️ Manuell</button>
        <button className={`tab${tab === "photo" ? " active" : ""}`} onClick={() => setTab("photo")}>📷 Foto-Import</button>
      </div>

      {tab === "manual" && (
        <div className="add-card">
          <div className="form-label">Emoji + Englisch</div>
          <div className="form-row">
            <input className="form-input emoji-input" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} />
            <input className="form-input" value={en} onChange={e => setEn(e.target.value)} placeholder="z. B. cat" onKeyDown={e => e.key === "Enter" && addManual()} />
          </div>
          <div className="form-label">Deutsch</div>
          <div className="form-row">
            <input className="form-input" value={de} onChange={e => setDe(e.target.value)} placeholder="z. B. Katze" onKeyDown={e => e.key === "Enter" && addManual()} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addManual}>Hinzufügen</button>
        </div>
      )}

      {tab === "photo" && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
          {!imageData ? (
            <div className="photo-drop" onClick={() => fileRef.current.click()}>
              <div className="ph-icon">📷</div>
              <p>Foto vom Englischbuch aufnehmen oder hochladen</p>
            </div>
          ) : (
            <>
              <ImageCropSelector imageData={imageData} onCropReady={setCroppedData} />
              {croppedData && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--green-light)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, border: "1px solid #bbf7d0" }}>
                  <img src={croppedData} alt="" style={{ height: 44, borderRadius: 6, objectFit: "cover" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#166534" }}>Bereich ausgewählt</div>
                    <div style={{ fontSize: 11, color: "#166534", opacity: .8 }}>Nur dieser Ausschnitt wird analysiert</div>
                  </div>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", opacity: .6, fontSize: 16 }} onClick={() => setCroppedData(null)}>✕</button>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10, marginBottom: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setImageData(null); setCroppedData(null); setAiResults([]); }}>Entfernen</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={loading} onClick={analyzePhoto}>
                  {loading ? <><span className="spinner" />Analysiere ...</> : croppedData ? "Auswahl analysieren" : "Ganzes Bild analysieren"}
                </button>
              </div>
            </>
          )}
          {aiResults.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15 }}>Gefunden ({aiResults.length})</span>
                <button className="btn btn-success btn-sm" onClick={addAllAi}>Alle übernehmen</button>
              </div>
              <div className="ai-list">
                {aiResults.map((r, i) => (
                  <div key={i} className="ai-item">
                    <div style={{ fontSize: 22 }}>{r.emoji}</div>
                    <div style={{ flex: 1 }}><div className="ai-en">{r.english}</div><div className="ai-de">{r.german}</div></div>
                    <button className="btn btn-primary btn-sm" onClick={() => addAiResult(r)}>+</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [cards, setCards] = useState(starterCards);
  const [view, setView] = useState("home");
  const [toast, setToast] = useState("");
  const [toastKey, setToastKey] = useState(0);

  const showToast = (msg) => { setToast(msg); setToastKey(k => k + 1); setTimeout(() => setToast(""), 2500); };
  const onRate = (id, q) => setCards(cs => cs.map(c => c.id === id ? { ...c, ...SM2(c, q) } : c));
  const due = cards.filter(isDue).length;
  const learned = cards.filter(c => c.repetitions >= 2).length;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header">
          <h1>VocaLearn</h1>
          <p>Englisch-Vokabeln trainieren</p>
        </div>
        <div className="stats-row">
          <div className="stat-card"><div className="num" style={{ color: "var(--amber)" }}>{due}</div><div className="lbl">Fällig</div></div>
          <div className="stat-card"><div className="num" style={{ color: "var(--green)" }}>{learned}</div><div className="lbl">Gelernt</div></div>
          <div className="stat-card"><div className="num" style={{ color: "var(--accent)" }}>{cards.length}</div><div className="lbl">Gesamt</div></div>
        </div>

        {view === "home"     && <HomeView cards={cards} onRate={onRate} />}
        {view === "quiz"     && <QuizView cards={cards} />}
        {view === "add"      && <AddView cards={cards} setCards={setCards} showToast={showToast} />}
        {view === "progress" && <ProgressView cards={cards} />}

        {toast && <Toast key={toastKey} msg={toast} />}

        <nav className="nav">
          {[
            { id: "home",     icon: "📚", label: "Lernen" },
            { id: "quiz",     icon: "🎯", label: "Quiz" },
            { id: "add",      icon: "＋", label: "Hinzufügen" },
            { id: "progress", icon: "📊", label: "Fortschritt" },
          ].map(n => (
            <button key={n.id} className={`nav-btn${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)}>
              <span className="icon">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
