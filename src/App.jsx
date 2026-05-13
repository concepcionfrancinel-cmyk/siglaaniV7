import { useState, useCallback, useEffect, useRef } from "react";
import "./App.css";

import SplashScreen       from "./components/SplashScreen";
import InstructionsScreen from "./components/InstructionsScreen";
import ScanScreen         from "./components/ScanScreen";
import ProcessingScreen   from "./components/ProcessingScreen";
import ResultScreen       from "./components/ResultScreen";
import HistoryScreen      from "./components/HistoryScreen";
import DashboardScreen    from "./components/DashboardScreen";

import { apiScan, ScanError }      from "./api";
import { RECOMMENDATIONS }         from "./constants";

let scanCounter = 0;

// REQ-4: Auto-return to splash after this many ms of inactivity
const INACTIVITY_TIMEOUT_MS = 60_000;

const CONDITION_LABELS = {
  ripe:     "Hinog (Ripe)",
  overripe: "Sobrang Hinog (Overripe)",
  unripe:   "Hindi Pa Hinog (Unripe)",
  rotten:   "Bulok (Rotten)",
};

function scoreFromFreshness(condition) {
  return condition === "ripe" ? 5 : condition === "rotten" ? 1 : 2;
}

function applyFruitIdentity(result) {
  const fruitName      = window.__siglaani_fruit_name__       ?? null;
  const scientific     = window.__siglaani_scientific__       ?? null;
  const modelCondition = window.__siglaani_class_condition__  ?? null;

  if (fruitName)  result.fruit      = fruitName;
  if (scientific) result.scientific = scientific;
  if (modelCondition) result.condition = modelCondition;

  if (result.condition) {
    result.conditionLabel = CONDITION_LABELS[result.condition] ?? result.condition;
    result.rating         = scoreFromFreshness(result.condition);

    const baseReco = RECOMMENDATIONS[result.condition] ?? result.recommendation;
    if (fruitName) {
      const prefix = result.condition === "ripe"
        ? `${fruitName} looks fresh. `
        : `${fruitName} looks not fresh. `;
      result.recommendation = `${prefix}${baseReco}`;
    } else {
      result.recommendation = baseReco;
    }
  }
  return result;
}

/** REQ-4: Wipe everything that could leak between sessions. */
function clearSessionData() {
  delete window.__siglaani_captured_image__;
  delete window.__siglaani_capture__;
  delete window.__siglaani_fruit_name__;
  delete window.__siglaani_scientific__;
  delete window.__siglaani_hsv_key__;
  delete window.__siglaani_class_condition__;
  delete window.__siglaani_bbox__;
}

export default function App() {
  const [screen,     setScreen]     = useState("splash");
  const [result,     setResult]     = useState(null);
  const [scanId,     setScanId]     = useState(0);
  const [prevScreen, setPrevScreen] = useState("splash");

  const inactivityRef = useRef(null);

  const go = useCallback((s) => setScreen(s), []);

  const goHistory = useCallback(() => {
    setPrevScreen(screen);
    setScreen("history");
  }, [screen]);

  const goDashboard = useCallback(() => {
    setPrevScreen(screen);
    setScreen("dashboard");
  }, [screen]);

  // REQ-4: timeout handler
  const handleInactivityTimeout = useCallback(() => {
    console.log("[SiglaAni] Inactivity timeout — clearing session");
    clearSessionData();
    setResult(null);
    setScanId(0);
    setPrevScreen("splash");
    setScreen("splash");
  }, []);

  useEffect(() => {
    if (screen === "splash") {
      if (inactivityRef.current) {
        clearTimeout(inactivityRef.current);
        inactivityRef.current = null;
      }
      return;
    }

    const reset = () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      inactivityRef.current = setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (inactivityRef.current) {
        clearTimeout(inactivityRef.current);
        inactivityRef.current = null;
      }
    };
  }, [screen, handleInactivityTimeout]);

  const handleProcessingComplete = useCallback(async () => {
    scanCounter++;

    try {
      const imagePayload = window.__siglaani_captured_image__ || null;

      const payload = {
        image:          imagePayload,
        detected_fruit: window.__siglaani_fruit_name__,
        hsv_key:        window.__siglaani_hsv_key__,
        bbox:           window.__siglaani_bbox__ || null,  // [x, y, w, h] in image px
      };

      const data = await apiScan(payload);
      setResult(applyFruitIdentity({ ...data }));
      setScanId(data.id);
      go("result");
    } catch (err) {
      // ── Backend rejected the scan because no fruit was visible ───────────
      // Don't fall through to a fake result — bounce the user back to the
      // scan screen with a friendly message.
      if (err instanceof ScanError &&
          (err.code === "no_fruit_detected" || err.code === "background_only")) {
        console.warn("[SiglaAni] No fruit detected:", err.userMessage);
        clearSessionData();
        // Use a small timeout so the alert appears AFTER React paints scan screen
        go("scan");
        setTimeout(() => {
          window.alert(err.userMessage ||
            "Walang prutas na nakita. Ilagay ang prutas sa harap ng camera at i-scan muli.");
        }, 50);
        return;
      }

      // ── Real network error → use offline fallback ────────────────────────
      console.warn("[SiglaAni] Backend unavailable, using local fallback:", err);
      const fruitName    = window.__siglaani_fruit_name__ ?? "Hindi Matukoy";
      const scientific   = window.__siglaani_scientific__ ?? "—";
      const fallbackCond = "ripe";

      setResult({
        fruit:          fruitName,
        scientific:     scientific,
        condition:      fallbackCond,
        conditionLabel: CONDITION_LABELS[fallbackCond],
        confidence:     75,
        rating:         4,
        recommendation: RECOMMENDATIONS[fallbackCond],
        id:             scanCounter,
        xai: {
          available: false,
          notice:    "Hindi maipakita ang AI explanation habang offline ang server.",
        },
      });
      setScanId(scanCounter);
      go("result");
    }
  }, [go]);

  const handleHome = useCallback(() => {
    clearSessionData();
    setResult(null);
    setScanId(0);
    go("splash");
  }, [go]);

  return (
    <div className="app-root">
      <div className="app-shell">
        {screen === "splash"     && <SplashScreen onStart={() => go("instr1")} onDashboard={goDashboard}/>}
        {screen === "instr1"     && <InstructionsScreen page={1} onNext={() => go("instr2")} onBack={() => go("splash")}/>}
        {screen === "instr2"     && <InstructionsScreen page={2} onNext={() => go("scan")}   onBack={() => go("instr1")}/>}
        {screen === "scan"       && <ScanScreen onScan={() => go("processing")} onHistory={goHistory}/>}
        {screen === "processing" && <ProcessingScreen onComplete={handleProcessingComplete}/>}
        {screen === "result"     && <ResultScreen result={result} scanId={scanId} onScanAgain={() => go("scan")} onHome={handleHome} onHistory={goHistory} onDashboard={goDashboard}/>}
        {screen === "history"    && <HistoryScreen onBack={() => go(prevScreen || "splash")} onScanAgain={() => go("scan")}/>}
        {screen === "dashboard"  && <DashboardScreen onBack={() => go(prevScreen || "splash")}/>}
      </div>
    </div>
  );
}
