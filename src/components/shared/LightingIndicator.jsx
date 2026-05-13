import { useEffect, useRef, useState } from 'react';

/**
 * REQ-8: Lighting-status indicator for the capture-guide interface.
 *
 * Samples the live <video> feed at 80×60 and computes mean Rec. 601 luma.
 * Reports one of: dark / ok / bright / checking.
 *
 * Usage in ScanScreen.jsx:
 *
 *     <video ref={videoRef} ... />
 *     <LightingIndicator videoRef={videoRef} active={!processing} />
 *
 * The thresholds below assume the 12V LED strip is the dominant light source
 * in the capture box. Tune DARK_THRESHOLD / BRIGHT_THRESHOLD for the final
 * physical enclosure if needed.
 */

const SAMPLE_INTERVAL_MS = 400;
const DARK_THRESHOLD     = 60;   // mean luma below this → "too dark"
const BRIGHT_THRESHOLD   = 200;  // mean luma above this → "too bright"

const STATUS_LABELS = {
  checking: { text: "Sinusuri ang ilaw…",          cls: "lite-checking" },
  dark:     { text: "Madilim — dagdagan ang ilaw", cls: "lite-dark"     },
  ok:       { text: "Tamang ilaw",                 cls: "lite-ok"       },
  bright:   { text: "Sobrang liwanag — bawasan",   cls: "lite-bright"   },
};

export default function LightingIndicator({ videoRef, active = true, showLumaDebug = false }) {
  const [status, setStatus] = useState("checking");
  const [luma,   setLuma]   = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    if (!canvasRef.current) {
      canvasRef.current        = document.createElement("canvas");
      canvasRef.current.width  = 80;
      canvasRef.current.height = 60;
    }
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });

    const sample = () => {
      const video = videoRef?.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        setStatus("checking");
        return;
      }
      try {
        ctx.drawImage(video, 0, 0, 80, 60);
        const data = ctx.getImageData(0, 0, 80, 60).data;
        let sum = 0;
        const pixelCount = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          // Rec. 601 luma — perceptual brightness
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const avg = sum / pixelCount;
        setLuma(Math.round(avg));
        if      (avg < DARK_THRESHOLD)   setStatus("dark");
        else if (avg > BRIGHT_THRESHOLD) setStatus("bright");
        else                             setStatus("ok");
      } catch {
        // CORS or video not yet ready — leave previous status
      }
    };

    sample();
    const id = setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [videoRef, active]);

  const info = STATUS_LABELS[status];

  return (
    <div className={`lighting-indicator ${info.cls}`} role="status" aria-live="polite">
      <span className="lite-dot" aria-hidden="true">●</span>
      <span className="lite-text">{info.text}</span>
      {showLumaDebug && <span className="lite-luma">L={luma}</span>}
    </div>
  );
}
