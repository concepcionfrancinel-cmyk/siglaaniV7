import { useState, useEffect, useRef } from 'react';
import * as cocoSsd  from '@tensorflow-models/coco-ssd';
import * as tmImage from '@teachablemachine/image';
import { apiScan } from '../api';
import Topbar   from './shared/Topbar';
import FruitBall from './shared/FruitBall';
import { COCO_FRUIT_LABELS } from '../constants';

// ─────────────────────────────────────────────────────────────────────────────
// ScanScreen
//
// Two-model pipeline:
//   1. COCO-SSD  — draws bounding boxes (fast, runs every frame)
//   2. MobileNet — classifies the actual fruit (runs every ~1s, more accurate)
//
// The MobileNet result is the source of truth for the fruit name.
// COCO-SSD is only used for the live box overlay.
// ─────────────────────────────────────────────────────────────────────────────

export default function ScanScreen({ onScan, onHistory }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const captureRef  = useRef(null);
  const cocoRef     = useRef(null);
  const mnetRef     = useRef(null);
  const streamRef   = useRef(null);
  const loopRef     = useRef(null);
  const mnetLoopRef = useRef(null);
  const timerRef    = useRef(null);
  const detectStart = useRef(null);
  const bestFruitBoxRef = useRef(null);
  const roiCanvasRef = useRef(null);

  const [status,    setStatus]    = useState("loading");
  const [loadMsg,   setLoadMsg]   = useState("Starting camera...");
  const [countdown, setCountdown] = useState(3);
  const [detected,  setDetected]  = useState(null); // { label, fruit, scientific, confidence, hsvKey }

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode:"environment", width:640, height:480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise(res => (videoRef.current.onloadedmetadata = res));
          videoRef.current.play();
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }

      // 2. COCO-SSD (for bounding boxes)
      if (!cancelled) setLoadMsg("Loading detection model (1/2)...");
      const coco = await cocoSsd.load({ base:"lite_mobilenet_v2" });
      if (cancelled) return;
      cocoRef.current = coco;

      // 3. MobileNet (for fruit classification)
      if (!cancelled) setLoadMsg("Loading classification model (2/2)...");
      const URL = "/custom_model/";
      const mnet = await tmImage.load(URL + "model.json", URL + "metadata.json");
      if (cancelled) return;
      mnetRef.current = mnet;

      setStatus("scanning");
      runCocoLoop();
      runMobileNetLoop();
    };

    init();

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
      clearTimeout(loopRef.current);
      clearTimeout(mnetLoopRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── COCO-SSD loop — bounding boxes only, fast ─────────────────────────────
  const runCocoLoop = async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const coco   = cocoRef.current;

    if (!video || !canvas || !coco || video.readyState < 2) {
      loopRef.current = setTimeout(runCocoLoop, 200);
      return;
    }

    const preds = await coco.detect(video);
    drawBoxes(preds, canvas, video);

    loopRef.current = setTimeout(runCocoLoop, 150);
  };

  // ── MobileNet loop — fruit classification, slower ─────────────────────────
  // ── MobileNet loop — fruit classification ─────────────────────────
  // ── MobileNet loop — fruit classification ─────────────────────────
  const runMobileNetLoop = async () => {
    const video = videoRef.current;
    const mnet  = mnetRef.current;

    // Wait until video and model are fully loaded
    if (!video || !mnet || video.readyState < 2) {
      mnetLoopRef.current = setTimeout(runMobileNetLoop, 400);
      return;
    }

    try {
      const preds = await mnet.predict(video);

      let match = null;
      for (const p of preds) {
        if (p.probability > 0.85 && p.className !== "Background") {
          
          let mappedKey = "generic";
          let modelCondition = null; // New variable to catch "rotten" or "fresh"
          const classNameStr = p.className.toLowerCase(); // e.g., "apple_rotten"
          
          // 1. Identify the base fruit
          if (classNameStr.includes("saging") || classNameStr.includes("banana")) mappedKey = "banana";
          if (classNameStr.includes("apple")) mappedKey = "apple";
          if (classNameStr.includes("orange") || classNameStr.includes("orange")) mappedKey = "orange";

          // 2. Identify the condition from your Teachable Machine labels!
          if (classNameStr.includes("rotten") || classNameStr.includes("bulok")) {
            modelCondition = "rotten";
          } else if (classNameStr.includes("fresh") || classNameStr.includes("ripe")) {
            // If the AI explicitly says it's fresh, we will still let the Python HSV
            // logic run to determine if it's ripe, unripe, or overripe based on color.
            modelCondition = null; 
          }

          match = { 
            fruit: p.className.split("_")[0], // Changes "apple_rotten" to just "apple" for the UI
            rawLabel: p.className,
            scientific: "SIGLA ANI AI", 
            hsvKey: mappedKey,
            explicitCondition: modelCondition, // Pass the condition we found
            confidence: Math.round(p.probability * 100) 
          };
          break; 
        }
      }

      if (match) {
        setDetected(match); 
        window.__siglaani_detected_fruit__   = match.rawLabel;
        window.__siglaani_hsv_key__          = match.hsvKey;
        window.__siglaani_fruit_name__       = match.fruit;
        window.__siglaani_scientific__       = match.scientific;
        
        // 🚀 NEW: Save the explicit condition so App.jsx can see it!
        window.__siglaani_class_condition__  = match.explicitCondition; 

        if (!detectStart.current) {
          detectStart.current = Date.now();
          let secs = 3;
          setCountdown(secs);
          timerRef.current = setInterval(() => {
            secs -= 1;
            setCountdown(secs);
            if (secs <= 0) {
              clearInterval(timerRef.current);
              captureAndProceed(); 
            }
          }, 1000);
        }
      } else {
        if (detectStart.current) {
          detectStart.current = null;
          clearInterval(timerRef.current);
          setCountdown(3);
          setDetected(null);
        }
      }
    } catch (e) {
      console.warn("MobileNet error:", e);
    }

    mnetLoopRef.current = setTimeout(runMobileNetLoop, 800);
  };

  // ── Draw COCO bounding boxes ───────────────────────────────────────────────
  const drawBoxes = (preds, canvas, video) => {
    const rect    = video.getBoundingClientRect();
    canvas.width  = rect.width  || video.videoWidth;
    canvas.height = rect.height || video.videoHeight;
    const ctx     = canvas.getContext("2d");
    const scaleX  = canvas.width  / video.videoWidth;
    const scaleY  = canvas.height / video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fruitPreds = preds
      .filter(pred => COCO_FRUIT_LABELS.includes(pred.class.toLowerCase()) && pred.score > 0.35)
      .sort((a, b) => b.score - a.score);

    bestFruitBoxRef.current = fruitPreds[0]?.bbox ?? null;

    fruitPreds.forEach(pred => {
      const [x, y, w, h] = pred.bbox;
      const sx = x * scaleX, sy = y * scaleY;
      const sw = w * scaleX, sh = h * scaleY;
      const conf = Math.round(pred.score * 100);

      ctx.strokeStyle = "#7ee84a";
      ctx.lineWidth   = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      // Corner accents
      const cLen = 14;
      ctx.lineWidth   = 3.5;
      [[sx,sy,1,1],[sx+sw,sy,-1,1],[sx,sy+sh,1,-1],[sx+sw,sy+sh,-1,-1]].forEach(([cx,cy,dx,dy]) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx * cLen, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * cLen);
        ctx.stroke();
      });

      // Label
      const label = `${pred.class.toUpperCase()}  ${conf}%`;
      ctx.font      = "bold 12px Nunito, sans-serif";
      const tw      = ctx.measureText(label).width;
      ctx.fillStyle = "#7ee84a";
      ctx.fillRect(sx, sy - 22, tw + 14, 20);
      ctx.fillStyle = "#0b1f0d";
      ctx.fillText(label, sx + 7, sy - 7);
    });
  };

  // ── Capture frame then proceed ─────────────────────────────────────────────
const captureAndProceed = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    // 1. The Goldilocks Crop (75%)
    // Not too wide (100%), not too tight (50%). This perfectly mimics the Python camera!
    const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.75; 
    const startX = (video.videoWidth - cropSize) / 2;
    const startY = (video.videoHeight - cropSize) / 2;

    // 2. Create the canvas
    const canvas = document.createElement("canvas");
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext("2d");
    
    // 3. Draw the perfectly balanced center crop
    ctx.drawImage(
      video, 
      startX, startY, cropSize, cropSize, // Source (75% center crop)
      0, 0, cropSize, cropSize            // Destination (draw on canvas)
    );
    
    // 4. Convert it to Base64
    const base64Image = canvas.toDataURL("image/jpeg");

    // 5. Save the image to the global window object so App.jsx can find it
    window.__siglaani_captured_image__ = base64Image;

    // 6. Trigger the prop from App.jsx to change to the Processing Screen
    if (typeof onScan === "function") {
      onScan(); 
    } else {
      console.error("onScan prop is missing!");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="screen scan-screen">
      <Topbar
        right={
          status === "loading"   ? loadMsg :
          status === "capturing" ? "Capturing..." : "Live Scanning"
        }
        onHistory={onHistory}
        showHistoryBtn
      />

      <div className="scan-wrap">
        {/* Viewfinder */}
        <div className="scan-viewfinder">
          <div className="vf-corner tl"/><div className="vf-corner tr"/>
          <div className="vf-corner bl"/><div className="vf-corner br"/>

          {status === "error" ? (
            <div className="cam-fallback">
              <FruitBall size={180}/>
              <div className="cam-err-badge">No camera detected</div>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:14, display:"block" }}/>
              <canvas ref={canvasRef}
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", borderRadius:14, pointerEvents:"none" }}/>
            </>
          )}

          <canvas ref={captureRef} style={{ display:"none" }}/>

          {status === "loading" && (
            <div className="scan-loading-overlay">
              <div className="scan-loading-spinner"/>
              <span>{loadMsg}</span>
            </div>
          )}

          {status === "capturing" && <div className="scan-capture-flash"/>}

          {/* Countdown ring */}
          {detected && status === "scanning" && (
            <div className="scan-countdown-wrap">
              <svg width="70" height="70" viewBox="0 0 70 70">
                <circle cx="35" cy="35" r="30" fill="rgba(0,0,0,0.55)"
                  stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
                <circle cx="35" cy="35" r="30" fill="none" stroke="#7ee84a" strokeWidth="4"
                  strokeDasharray={`${((3 - countdown) / 3) * 188} 188`}
                  strokeLinecap="round" transform="rotate(-90 35 35)"
                  style={{ transition:"stroke-dasharray 0.9s linear" }}/>
                <text x="35" y="42" textAnchor="middle" fill="#fff" fontSize="22"
                  fontWeight="800" fontFamily="Nunito, sans-serif">{countdown}</text>
              </svg>
            </div>
          )}

          {/* Detected pill — shows Filipino fruit name from MobileNet */}
          {detected && status === "scanning" && (
            <div className="scan-detected-pill">
              <div className="scan-detected-dot"/>
              {detected.fruit} — {detected.confidence}% confidence
            </div>
          )}

          {!detected && status === "scanning" && (
            <div className="scan-aim-guide">Itutok ang camera sa prutas</div>
          )}
        </div>

        {/* Side panel */}
        <div className="scan-panel">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div className="scan-info-title">
              {status === "loading"   ? "Inihahanda..."              :
               status === "capturing" ? "Kinukuha ang larawan!"      :
               detected               ? `${detected.fruit} nakita!`  :
               "Handa na ba?"}
            </div>
            <div className="scan-info-body">
              {status === "loading"
                ? loadMsg
                : detected
                ? `${detected.fruit} (${detected.scientific}) — ${detected.confidence}% confidence. Mag-a-auto scan sa loob ng ${countdown}s.`
                : "Iposisyon ang prutas sa harap ng camera. Awtomatiko itong makikilala ng sistema."}
            </div>

            {detected && (
              <div className="scan-conf-meter">
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,.45)" }}>Classification confidence</span>
                  <span style={{ fontSize:11, color:"#7ee84a", fontWeight:700 }}>{detected.confidence}%</span>
                </div>
                <div style={{ height:5, background:"rgba(255,255,255,.08)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${detected.confidence}%`, height:"100%", background:"#7ee84a", borderRadius:3, transition:"width .3s" }}/>
                </div>
              </div>
            )}

            <div className="scan-tip">
              <div className="scan-tip-label">
                {detected ? `⏱ Auto-scan in ${countdown}s` : "💡 Tip"}
              </div>
              <div className="scan-tip-text">
                {detected
                  ? "Panatilihin ang prutas sa loob ng frame. Awtomatiko itong ma-scan."
                  : "Itutok lang ang camera sa prutas at hintayin ang label."}
              </div>
            </div>
          </div>

          <div className="scan-status-row">
            <div className={`scan-status-dot ${status === "scanning" ? "active" : ""}`}/>
            <span className="scan-status">
              {status === "loading"   ? loadMsg                       :
               status === "capturing" ? "Capturing frame..."          :
               detected               ? `Auto-scanning in ${countdown}s` :
               "Searching for fruit..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}