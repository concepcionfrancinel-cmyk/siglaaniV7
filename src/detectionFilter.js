/**
 * detectionFilter.js — bounding box optimization for SiglaAni
 *
 * Coco-SSD returns up to 20 boxes per frame, often with low-confidence
 * detections that flicker the UI. The system is only trained on three
 * fruits, so anything else is noise.
 *
 * This module:
 *   1. Filters Coco-SSD output to apple/banana/orange.
 *   2. Drops detections below a confidence threshold.
 *   3. Picks ONE best box per frame — no multi-box clutter.
 *   4. Smooths the box across frames with EMA to kill jitter.
 *   5. Sticks the last good box for a few frames when detection drops, so
 *      a single bad frame doesn't make the box disappear.
 *   6. Tracks consecutive-confident-frames so the scan button can stay
 *      disabled until detection is stable.
 *
 * Usage in ScanScreen.jsx:
 *
 *     import {
 *       filterDetections, resetDetectionFilter,
 *       isFruitPresent, getCurrentDetection
 *     } from './detectionFilter';
 *
 *     // every frame:
 *     const predictions = await cocoModel.detect(video);
 *     const best = filterDetections(predictions);
 *     drawBoxes(best);
 *
 *     // gate the scan button:
 *     setCanScan(isFruitPresent());
 *
 *     // on capture:
 *     const det = getCurrentDetection();
 *     if (det) window.__siglaani_bbox__ = det.bbox;  // [x,y,w,h]
 *
 *     // on unmount:
 *     useEffect(() => () => resetDetectionFilter(), []);
 */

export const TRAINED_FRUIT_LABELS = ["apple", "banana", "orange"];

const MIN_DETECTION_SCORE = 0.55;  // raise to demand more confident matches
const EMA_ALPHA           = 0.45;  // 0 = freeze, 1 = no smoothing
const STICKY_FRAMES       = 4;     // keep last box this many empty frames
const STABLE_FRAMES_NEEDED = 3;    // consecutive frames before scan is enabled

let smoothBox    = null;   // [x, y, w, h]
let smoothLabel  = null;
let smoothScore  = 0;
let stickyLeft   = 0;
let stableCount  = 0;      // increments while a fresh (non-sticky) detection is present

/**
 * @param {Array<{bbox:number[], class:string, score:number}>} predictions
 * @returns {Array<{bbox:number[], class:string, score:number}>}  — 0 or 1 boxes
 */
export function filterDetections(predictions) {
  const valid = (predictions || []).filter(p =>
    TRAINED_FRUIT_LABELS.includes(p.class.toLowerCase()) &&
    p.score >= MIN_DETECTION_SCORE
  );

  if (valid.length === 0) {
    // No fresh detection this frame — stable counter resets immediately
    stableCount = 0;
    if (stickyLeft > 0 && smoothBox) {
      stickyLeft--;
      return [{ bbox: smoothBox, class: smoothLabel, score: smoothScore }];
    }
    smoothBox = null; smoothLabel = null; smoothScore = 0;
    return [];
  }

  const best = valid.reduce((a, b) => (a.score >= b.score ? a : b));
  const [bx, by, bw, bh] = best.bbox;
  const sameLabel = (smoothLabel === best.class.toLowerCase());

  if (smoothBox && sameLabel) {
    smoothBox = [
      smoothBox[0] * (1 - EMA_ALPHA) + bx * EMA_ALPHA,
      smoothBox[1] * (1 - EMA_ALPHA) + by * EMA_ALPHA,
      smoothBox[2] * (1 - EMA_ALPHA) + bw * EMA_ALPHA,
      smoothBox[3] * (1 - EMA_ALPHA) + bh * EMA_ALPHA,
    ];
  } else {
    smoothBox = [bx, by, bw, bh];
    stableCount = 0;  // label changed — reset stability
  }
  smoothLabel = best.class.toLowerCase();
  smoothScore = best.score;
  stickyLeft  = STICKY_FRAMES;
  stableCount = Math.min(stableCount + 1, 999);

  return [{ bbox: smoothBox, class: smoothLabel, score: smoothScore }];
}

/** Wipe state — call when leaving the scan screen */
export function resetDetectionFilter() {
  smoothBox   = null;
  smoothLabel = null;
  smoothScore = 0;
  stickyLeft  = 0;
  stableCount = 0;
}

/** Inspect current state (use this to read bbox for capture). */
export function getCurrentDetection() {
  if (!smoothBox) return null;
  return {
    bbox:  [...smoothBox],
    class: smoothLabel,
    score: smoothScore,
  };
}

/**
 * True if we have a stable, confident detection right now.
 * Use to gate the scan button — refuses to scan empty frames.
 */
export function isFruitPresent() {
  return smoothBox !== null && stableCount >= STABLE_FRAMES_NEEDED;
}
