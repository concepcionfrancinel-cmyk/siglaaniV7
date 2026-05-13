import { useState } from 'react';
import LeafSVG from './shared/LeafSVG';
import { badge } from '../constants';

// ── Likert rating config ──────────────────────────────────────────────────────
const LIKERT = [
  { stars: 1, label: "Hindi Nakakain",  color: "#ef5350" },
  { stars: 2, label: "Medyo Luma",      color: "#f97316" },
  { stars: 3, label: "Katamtaman",      color: "#f9a825" },
  { stars: 4, label: "Sariwa",          color: "#66bb6a" },
  { stars: 5, label: "Napakasariwa",    color: "#5cb83a" },
];

function StarRating({ rating = 3 }) {
  const info = LIKERT[Math.min(Math.max(rating, 1), 5) - 1];
  return (
    <div className="star-rating-wrap">
      <div className="star-row">
        {[1, 2, 3, 4, 5].map(n => (
          <svg key={n} width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l2.9 6.1L22 9.3l-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l7.1-1.2z"
              fill={n <= rating ? info.color : "rgba(255,255,255,0.12)"}
              stroke={n <= rating ? info.color : "rgba(255,255,255,0.15)"}
              strokeWidth="1"
            />
          </svg>
        ))}
      </div>
      <div className="star-label" style={{ color: info.color }}>{info.label}</div>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────
export default function ResultScreen({ result, scanId, onScanAgain, onHome, onHistory, onDashboard }) {
  const now    = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  const b      = badge(result?.condition ?? "ripe");
  const rating = result?.rating ?? 3;

  // REQ-32..36: XAI overlay state
  const xai          = result?.xai;
  const hasXAI       = !!(xai && xai.available && xai.overlay);
  const xaiNotice    = xai && !xai.available ? (xai.notice || "Walang available na paliwanag.") : null;
  const [showXAI, setShowXAI] = useState(false);

  // Image source — fall back through the three places it could live
  const captureSrc =
    window.__siglaani_capture__ ||
    window.__siglaani_captured_image__ ||
    (result?.thumbnail ? `data:image/jpeg;base64,${result.thumbnail}` : null);

  const xaiSrc = hasXAI ? `data:image/jpeg;base64,${xai.overlay}` : null;
  const displaySrc = (showXAI && xaiSrc) ? xaiSrc : captureSrc;

  return (
    <div className="screen result-screen">

      {/* ── Top bar ── */}
      <div className="result-header">
        <div className="header-logo">
          <LeafSVG size={22}/>
          <span className="header-logo-text">SIGLA ANI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="tb-hist-btn tb-hist-btn--dark" onClick={onHistory}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4"    width="16" height="2.5" rx="1.2" fill="currentColor"/>
              <rect x="2" y="8.75" width="16" height="2.5" rx="1.2" fill="currentColor"/>
              <rect x="2" y="13.5" width="10" height="2.5" rx="1.2" fill="currentColor"/>
            </svg>
            History
          </button>
          <div className={`result-badge ${b.cls}`}>{b.label}</div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="result-body">

        {/* Left — captured photo + XAI toggle */}
        <div className="res-left">
          <div className="res-image-stack">
            {displaySrc
              ? <img src={displaySrc} className="res-captured" alt={showXAI ? "AI explanation overlay" : "scanned fruit"}/>
              : <div className="result-fruit-img"><div className="result-fruit-shine"/></div>
            }

            {/* REQ-34: superimpose XAI overlay on the original image with a toggle */}
            {hasXAI && (
              <button
                className={`xai-toggle ${showXAI ? "xai-toggle--active" : ""}`}
                onClick={() => setShowXAI(s => !s)}
                aria-pressed={showXAI}
              >
                {showXAI ? "← Original" : "AI View"}
              </button>
            )}

            {/* REQ-36: notice when no overlay could be generated */}
            {!hasXAI && xaiNotice && (
              <div className="xai-unavailable" title={xaiNotice}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 4.5v4M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Walang AI explanation
              </div>
            )}
          </div>
        </div>

        {/* Right — info */}
        <div className="res-right">

          {/* Fruit name + badge */}
          <div className="res-name-row">
            <div>
              <div className="result-fruit-name">{result?.fruit ?? "Unknown"}</div>
              <div className="result-fruit-sci">{result?.scientific ?? ""}</div>
            </div>
            <div className={`result-badge ${b.cls}`} style={{ alignSelf: "flex-start" }}>{b.label}</div>
          </div>

          {/* Star / Likert rating */}
          <StarRating rating={rating}/>

          {/* REQ-35: short, non-technical XAI explanation — only shown while AI View is active */}
          {showXAI && hasXAI && (
            <div className="res-xai-explain">
              <div className="res-xai-label">AI Explanation</div>
              <div className="res-xai-text">{xai.explanation}</div>
              {typeof xai.coverage === "number" && (
                <div className="res-xai-meta">
                  Activation coverage: {(xai.coverage * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}

          {/* Suggestion (Tagalog recommendation) */}
          {!showXAI && (
            <div className="res-suggestion">
              <div className="res-suggestion-label">Rekomendasyon</div>
              <div className="res-suggestion-text">
                {result?.recommendation ?? "—"}
              </div>
            </div>
          )}

          {/* Time + ID + Confidence */}
          <div className="res-meta-row">
            <div className="res-meta-cell">
              <div className="res-meta-label">Oras ng Scan</div>
              <div className="res-meta-val">{now}</div>
            </div>
            <div className="res-meta-cell">
              <div className="res-meta-label">Scan ID</div>
              <div className="res-meta-val">#{String(result?.id ?? scanId).padStart(4, "0")}</div>
            </div>
            <div className="res-meta-cell">
              <div className="res-meta-label">Confidence</div>
              <div className="res-meta-val">{result?.confidence ?? "—"}%</div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="result-footer">
            <button className="scan-again-btn" onClick={onScanAgain}>+ I-scan Muli</button>
            <button
              onClick={onDashboard}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "12px 20px", borderRadius: "12px",
                border: "1px solid #d1e8ce", backgroundColor: "#f9f9f9",
                color: "#555", fontSize: "16px", cursor: "pointer", fontWeight: "bold",
              }}>
              📊 Dashboard
            </button>
            <button className="history-btn" onClick={onHome}>🏠 Home</button>
          </div>

        </div>
      </div>
    </div>
  );
}
