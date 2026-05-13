import { useState, useEffect } from 'react';
import logo from '../logo.png';
import Topbar from './shared/Topbar';

const PROC_STEPS = [
  "Kinukuha ang larawan",
  "Sinusuri ang kulay at texture",
  "Nagpapatakbo ng ML model",
  "Naghahanda ng resulta...",
];
const MILESTONES = [25, 55, 80, 100];

export default function ProcessingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stepIdx,  setStepIdx]  = useState(0);

  useEffect(() => {
    let p = 0, si = 0;
    const iv = setInterval(() => {
      p += Math.random() * 4 + 1;
      if (p > 100) p = 100;
      setProgress(Math.round(p));
      if (si < MILESTONES.length && p >= MILESTONES[si]) { si++; setStepIdx(si); }
      if (p >= 100) { clearInterval(iv); setTimeout(onComplete, 700); }
    }, 60);
    return () => clearInterval(iv);
  }, [onComplete]);

  return (
    <div className="screen processing-screen">
      <Topbar right="Nagpo-proseso..."/>
      <div className="proc-wrap">
        <div className="proc-scanner">
          <div className="proc-scanline"/>
          <img src={logo} alt="logo" width="90" height="90"
            style={{ objectFit:"contain", opacity:0.7 }}/>
        </div>
        <div className="proc-info">
          <div className="proc-label">Sinusuri...</div>
          <div className="proc-sub">{PROC_STEPS[Math.min(stepIdx, 3)]}</div>
          <div className="proc-bar-wrap">
            <div className="proc-bar-fill" style={{ width:`${progress}%` }}/>
          </div>
          <div className="proc-pct">{progress}%</div>
          <div className="proc-steps">
            {PROC_STEPS.map((s, i) => (
              <div key={i} className={`proc-step-item ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}>
                <div className="proc-step-dot"/>{s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
