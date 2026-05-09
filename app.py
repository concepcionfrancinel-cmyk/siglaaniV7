"""
SiglaAni — Flask Backend (FULL IOT HARDWARE VERSION)
- Pi 5 Safe (gpiozero) replacing RPi.GPIO to fix RP1 crash
- MQ-2 Sensor Integration (Methane/Rotting Gas Detection)
- Actuator Logic: Retracts to pull fruit, then extends to reset
- Fan Logic: Runs continuously once booted
"""

import os, sqlite3, base64, time, threading
from datetime import datetime
import numpy as np
import cv2
from flask import Flask, jsonify, request
from flask_cors import CORS

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(__file__)
DB_PATH     = os.path.join(BASE_DIR, "siglaani.db")
CAPTURE_DIR = os.path.join(BASE_DIR, "captures")       
XAI_DIR     = os.path.join(BASE_DIR, "xai_overlays")   
os.makedirs(CAPTURE_DIR, exist_ok=True)
os.makedirs(XAI_DIR, exist_ok=True)

USE_TFLITE = False
MIN_FRUIT_SATURATION_RATIO = 0.10
XAI_MIN_CONFIDENCE = 60
XAI_MIN_COVERAGE   = 0.015
XAI_MAX_COVERAGE   = 0.85

app = Flask(__name__)
CORS(app)

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma']        = 'no-cache'
    response.headers['Expires']       = '-1'
    return response

# ── IOT HARDWARE SETUP (PI 5 SAFE - GPIOZERO) ────────────────────────────────
try:
    from gpiozero import DigitalOutputDevice, DigitalInputDevice, DistanceSensor
    
    # Active Low logic handled automatically by active_high=False
    actuator_relay = DigitalOutputDevice(17, active_high=False) 
    
    # FAN STARTS ON IMMEDIATELY and stays on to clear methane
    fan_relay      = DigitalOutputDevice(27, active_high=False, initial_value=True) 
    
    led_relay      = DigitalOutputDevice(26, active_high=False) 
    
    # Swapped to MQ-2 for methane/combustible gas
    mq2_sensor     = DigitalInputDevice(22)  
    bin_sensor     = DistanceSensor(echo=24, trigger=23, max_distance=0.5, threshold_distance=0.05)
    
    hardware_enabled = True
    print("[IoT] Hardware initialized for Pi 5! (MQ-2 Active, Fan Running)")
except Exception as e:
    hardware_enabled = False
    print(f"[IoT] Hardware disabled (normal if testing on Windows). Error: {e}")

# Keep camera warm to eliminate scan lag
print("[IoT] Warming up camera...")
cap = cv2.VideoCapture(0)
time.sleep(2)

# ── IOT HARDWARE FUNCTIONS ───────────────────────────────────────────────────
def trigger_actuator():
    if not hardware_enabled: return
    
    # Logic: Actuator is naturally stretched out.
    # .on() triggers the relay LOW -> Actuator RETRACTS (pulls fruit to bin)
    print("[IoT] Actuator RETRACTING (Pulling rotten fruit into the bin)...")
    actuator_relay.on() 
    
    time.sleep(3) # Wait 3 seconds for it to fully pull and drop
    
    # .off() triggers the relay HIGH -> Actuator EXTENDS (returns to start)
    print("[IoT] Actuator EXTENDING (Returning to original stretched form)...")
    actuator_relay.off()

# ── Database ──────────────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            fruit           TEXT    NOT NULL DEFAULT 'Unknown',
            scientific      TEXT    DEFAULT '',
            condition       TEXT    NOT NULL DEFAULT 'ripe',
            condition_label TEXT    DEFAULT '',
            confidence      REAL    DEFAULT 0,
            rating          INTEGER DEFAULT 3,
            recommendation  TEXT    DEFAULT '',
            temp            REAL    DEFAULT 0,
            thumbnail       TEXT    DEFAULT '',
            scanned_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            capture_filename TEXT   DEFAULT '',
            xai_filename     TEXT   DEFAULT '',
            xai_coverage     REAL   DEFAULT 0,
            xai_explanation  TEXT   DEFAULT '',
            xai_generated    INTEGER DEFAULT 0
        )
    """)
    new_cols = [
        ("capture_filename", "TEXT DEFAULT ''"),
        ("xai_filename",     "TEXT DEFAULT ''"),
        ("xai_coverage",     "REAL DEFAULT 0"),
        ("xai_explanation",  "TEXT DEFAULT ''"),
        ("xai_generated",    "INTEGER DEFAULT 0"),
    ]
    for col, decl in new_cols:
        try:
            conn.execute(f"ALTER TABLE scans ADD COLUMN {col} {decl}")
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()
    print(f"[SiglaAni] DB ready → {DB_PATH}")

def save_scan(data: dict) -> int:
    conn = sqlite3.connect(DB_PATH, timeout=15)
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO scans
              (fruit, scientific, condition, condition_label,
               confidence, rating, recommendation, temp, thumbnail,
               capture_filename, xai_filename, xai_coverage,
               xai_explanation, xai_generated)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            str(data.get("fruit",            "Unknown")),
            str(data.get("scientific",       "")),
            str(data.get("condition",        "ripe")),
            str(data.get("conditionLabel",   "")),
            float(data.get("confidence",     0)),
            int(data.get("rating",           3)),
            str(data.get("recommendation",   "")),
            float(data.get("temp",           0)),
            str(data.get("thumbnail",        "")),
            str(data.get("capture_filename", "")),
            str(data.get("xai_filename",     "")),
            float(data.get("xai_coverage",   0)),
            str(data.get("xai_explanation",  "")),
            int(data.get("xai_generated",    0)),
        ))
        conn.commit()
        new_id = cur.lastrowid
        return new_id
    finally:
        conn.close()

# ── Image helpers & Metadata (Kept intact) ───────────────────────────────────
def decode_image(b64_string: str):
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_string)
    arr   = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Failed to decode image")
    return frame

def make_thumbnail(frame, max_px=160) -> str:
    h, w = frame.shape[:2]
    scale = max_px / max(h, w)
    small = cv2.resize(frame, (int(w * scale), int(h * scale)))
    _, buf = cv2.imencode(".jpg", small, [cv2.IMWRITE_JPEG_QUALITY, 72])
    return base64.b64encode(buf).decode()

def save_capture_image(frame) -> str:
    ts       = datetime.now().strftime("%Y%m%d_%H%M%S_") + f"{datetime.now().microsecond // 1000:03d}"
    filename = f"scan_{ts}.jpg"
    filepath = os.path.join(CAPTURE_DIR, filename)
    cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return filename

CONDITION_LABELS = {
    "ripe":     "Hinog (Ripe)",
    "overripe": "Sobrang Hinog (Overripe)",
    "unripe":   "Hindi Pa Hinog (Unripe)",
    "rotten":   "Bulok (Rotten)",
}

RECOMMENDATIONS = {
    "ripe":     "Ang prutas ay nasa tamang kondisyon para sa pagkain.",
    "overripe": "Ang prutas ay medyo sobrang hinog na. Gamitin kaagad.",
    "unripe":   "Ang prutas ay hindi pa ganap na hinog. Ilagay sa maaliwalas na lugar.",
    "rotten":   "Ang prutas ay hindi na ligtas kainin. Itapon na ito agad.",
}

COCO_TO_FRUIT = {
    "apple":   ("Apple",  "Malus domestica"),
    "banana":  ("Saging", "Musa acuminata"),
    "orange":  ("Orange", "Citrus sinensis"),
}

def condition_to_rating(condition: str, confidence: int) -> int:
    if condition == "ripe":
        if confidence >= 85: return 5
        if confidence >= 72: return 4
        return 3
    if condition == "overripe":
        return 2 if confidence >= 75 else 3
    if condition == "unripe":
        return 3
    return 1

def get_analysis_region(frame, bbox=None, padding=0.05):
    h, w = frame.shape[:2]
    cy, cx = h // 2, w // 2
    ch, cw = max(1, int(h * 0.40) // 2), max(1, int(w * 0.40) // 2)
    return frame[cy - ch:cy + ch, cx - cw:cx + cw], (cx - cw, cy - ch, cx + cw, cy + ch)

def has_fruit_content(crop) -> bool:
    if crop is None or crop.size == 0: return False
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    S, V = hsv[:, :, 1], hsv[:, :, 2]
    fruit_like = ((S > 50) & (V > 45) & (V < 245)).sum()
    ratio = fruit_like / float(S.size)
    return ratio >= MIN_FRUIT_SATURATION_RATIO

def _build_masks(hsv: np.ndarray, fruit_key: str) -> dict:
    H = hsv[:, :, 0].astype(np.int32)
    S = hsv[:, :, 1].astype(np.int32)
    V = hsv[:, :, 2].astype(np.int32)

    if fruit_key == "banana":
        return {
            "ripe":     (H >= 15) & (H <= 40) & (S > 70) & (V > 110),
            "unripe":   (H >= 41) & (H <= 80) & (S > 60) & (V > 100),
            "overripe": (H >= 8)  & (H <= 25) & (S > 40) & (V >= 60) & (V < 160),
            "rotten":   (S < 50)  & (V < 80),
        }
    return {
        "ripe":     (((H >= 0)  & (H <= 15) & (S > 80) & (V > 80)) |
                    ((H >= 20) & (H <= 35) & (S > 80) & (V > 100))),
        "unripe":   (H >= 36) & (H <= 85) & (S > 60) & (V > 80),
        "overripe": (((H >= 10) & (H <= 25) & (S > 40) & (V < 130)) |
                    ((H >= 0)  & (H <= 10) & (S > 30) & (V < 100))),
        "rotten":   (S < 40)  & (V < 80),
    }

def analyse_crop(crop: np.ndarray, detected_fruit: str = None) -> dict:
    hsv       = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    fruit_key = (detected_fruit or "").lower().strip()
    masks     = _build_masks(hsv, fruit_key)
    total     = masks["ripe"].size

    scores = {k: float(m.sum()) / total for k, m in masks.items()}
    condition = max(scores, key=scores.get)
    raw_conf  = scores[condition]
    
    if raw_conf < 0.06: condition = "ripe"

    total_fruit_pixels = sum(scores.values())
    if total_fruit_pixels > 0:
        ratio      = scores[condition] / total_fruit_pixels
        confidence = min(98, round(45 + (ratio * 53)))
    else:
        confidence = 72

    fruit, sci = COCO_TO_FRUIT.get(fruit_key, ("Unknown", "—"))
    rating = condition_to_rating(condition, confidence)

    return {
        "fruit":          fruit,
        "scientific":     sci,
        "condition":      condition,
        "conditionLabel": CONDITION_LABELS[condition],
        "confidence":     confidence,
        "rating":         rating,
        "recommendation": RECOMMENDATIONS[condition],
    }

def get_cpu_temp() -> float:
    try:
        with open("/sys/class/thermal/thermal_zone0/temp") as f:
            return round(int(f.read()) / 1000, 1)
    except Exception:
        return 0.0

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/api/light', methods=['POST'])
def toggle_light():
    if not hardware_enabled:
        return jsonify({"status": "hardware_disabled"}), 200
        
    data = request.get_json(silent=True) or {}
    if data.get("state") == "on":
        led_relay.on()  # Drives LOW -> Turns ON
        print("[IoT] White LED Strip ON")
    else:
        led_relay.off() # Drives HIGH -> Turns OFF
        print("[IoT] White LED Strip OFF")
        
    return jsonify({"status": "success"}), 200

@app.route("/api/scan", methods=["POST"])
def scan():
    body           = request.get_json(silent=True) or {}
    detected_fruit = body.get("hsv_key") or body.get("detected_fruit") or None
    image_b64      = body.get("image") or None
    bbox           = body.get("bbox") or None  

    if not detected_fruit:
        return jsonify({"error": "no_fruit_detected", "message": "Walang prutas na nakita."}), 400

    if image_b64:
        try:
            frame = decode_image(image_b64)
        except Exception as e:
            return jsonify({"error": "decode_failed", "message": f"Image decode failed: {e}"}), 400
    else:
        try:
            ret, frame = cap.read()
            if not ret:
                return jsonify({"error": "camera_failed", "message": "Camera could not capture."}), 500
        except Exception as e:
            return jsonify({"error": "camera_failed", "message": f"Camera error: {e}"}), 500

    crop, crop_rect = get_analysis_region(frame, bbox)

    if not has_fruit_content(crop):
        return jsonify({"error": "background_only", "message": "Hindi maliwanag na nakita ang prutas."}), 400

    try:
        result = analyse_crop(crop, detected_fruit)
    except Exception as e:
        return jsonify({"error": "analysis_failed", "message": f"Analysis error: {e}"}), 500

    # =====================================================================
    # --- IOT LOGIC (ACTUATOR, MQ-2 SENSOR, BIN SENSOR) ---
    # =====================================================================
    condition = result["condition"]
    gas_detected = False
    bin_is_full = False
    spoilage_prob = (100 - result["confidence"]) if condition in ["ripe", "unripe"] else result["confidence"]

    if hardware_enabled:
        bin_is_full = bin_sensor.distance < 0.10
        
        if bin_is_full:
            print("[IoT] WARNING: Disposal Bin is FULL!")
            result["hardware_alert"] = "Puno na ang disposal drawer!"

        gas_detected = mq2_sensor.is_active 
        
        if gas_detected and condition != "rotten":
            print("[IoT] MQ-2 Override! Detected methane/gases from rotting organic matter.")
            condition = "rotten"
            result["condition"] = "rotten"
            result["conditionLabel"] = "Bulok (Rotten) - Gas Detected"
            result["rating"] = 1
            result["recommendation"] = "Ayon sa MQ-2 sensor, may na-detect na gas mula sa pagkabulok. Itapon na ito."
            spoilage_prob = 98

        # Trigger Actuator ONLY if rotten/overripe AND bin is not full
        if condition in ["rotten", "overripe"]:
            if not bin_is_full:
                threading.Thread(target=trigger_actuator).start()

    result["gas_detected"] = gas_detected
    result["spoilage_probability"] = int(spoilage_prob)
    # =====================================================================

    result["temp"]      = get_cpu_temp()
    result["thumbnail"] = make_thumbnail(frame)
    result["capture_filename"] = save_capture_image(frame)
    
    result["xai"] = {"available": False, "notice": "XAI skipped."}
    result["xai_filename"], result["xai_coverage"], result["xai_explanation"], result["xai_generated"] = "", 0, "", 0

    try:
        result["id"] = save_scan(result)
    except Exception as e:
        result["id"] = 0

    return jsonify(result), 200

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    app.run(port=5001, debug=True)