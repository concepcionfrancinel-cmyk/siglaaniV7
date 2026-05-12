# SiglaAni — Fruit Freshness Scanner

Touchscreen React app + Flask backend for detecting whether a fruit is **ripe, unripe, overripe, or rotten**.
Designed for Raspberry Pi 4 + 800×480 LCD, but fully runnable on any laptop during development.

---

## Running on your laptop (dev mode)

### 1. Backend
```bash
cd SiglaAni/backend

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
# → Running on http://0.0.0.0:5000
```

The backend will:
- Open your **laptop webcam** (index 0) when `POST /api/scan` is called
- Run **colour-heuristic analysis** (no TFLite model needed yet)
- Save results to a local `siglaani.db` SQLite file

### 2. Frontend
```bash
cd SiglaAni

npm install
npm start
# → http://localhost:3000
```

> Both must be running at the same time. Open two terminals.

---

## Project structure

```
SiglaAni/
├── src/
│   ├── App.jsx       ← All 7 screens (Splash, Instructions×2, Scan, Processing, Result, History)
│   └── App.css       ← 800×480 landscape styles
├── backend/
│   ├── app.py        ← Flask API
│   └── requirements.txt
├── package.json
└── README.md
```

---

## API endpoints

| Method   | Path                  | Description                        |
|----------|-----------------------|------------------------------------|
| GET      | `/api/health`         | Check server status + mode         |
| POST     | `/api/scan`           | Capture frame, analyse, save & return result |
| GET      | `/api/history`        | List past scans (newest first)     |
| DELETE   | `/api/history/:id`    | Delete one scan record             |
| DELETE   | `/api/history`        | Clear all scan records             |

### Scan response shape
```json
{
  "id": 5,
  "fruit": "Apple",
  "scientific": "Malus domestica",
  "condition": "ripe",
  "conditionLabel": "Hinog (Ripe)",
  "confidence": 87,
  "ripe": 82,
  "firmness": 68,
  "decay": 6,
  "recommendation": "Ang prutas ay nasa tamang kondisyon...",
  "temp": 0,
  "thumbnail": "<base64 JPEG>"
}
```

---

## Switching to TFLite (when model is ready)

1. Place your model files:
   ```
   backend/model/fruit_classifier.tflite
   backend/model/labels.txt
   ```
2. In `backend/app.py`, flip the flag:
   ```python
   USE_TFLITE = True
   ```
3. Labels format (`labels.txt`) — one per line, matching classifier output index:
   ```
   apple_ripe
   apple_unripe
   apple_rotten
   banana_ripe
   ...
   ```

---

## Deploying to Raspberry Pi

1. Copy the entire project to the Pi.
2. Change camera index if needed (`CAMERA_INDEX = 0` in `app.py`).
3. Replace `opencv-python` with `opencv-python-headless` in `requirements.txt`.
4. Build the React app: `npm run build`
5. Serve with `serve -s build -l 3000` and launch Chromium in kiosk mode.

See the full Pi setup guide in the original README section.

---

## Screen flow

```
Splash ──→ Instructions 1 ──→ Instructions 2 ──→ Scan ──→ Processing ──→ Result
  │                                                │                       │
  └──────────────── History ◄─────────────────────┴───────────────────────┘
```
