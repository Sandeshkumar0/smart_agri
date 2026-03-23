# Smart Agri Backend (Node + Express)

## Setup
1. `cd server`
2. `npm install`
3. `copy .env.example .env`
4. Add at least one weather key: `OPENWEATHER_API_KEY` or `WEATHERBIT_API_KEY`
5. Add `DATABASE_URL` (Neon) to enable PostgreSQL tables
5. `npm run dev`

## Base URL
`http://localhost:8000/api`

## Routes
- `GET /api/health`
- `POST /api/auth/demo-login`
- `GET /api/farm/crops`
- `POST /api/farm/crops`
- `GET /api/farm/fields`
- `POST /api/farm/fields`
- `GET /api/scanner/scans`
- `POST /api/scanner/scans`
- `GET /api/weather/forecast10?city=Kendujhar`
- `GET /api/frontend/analytics`
- `POST /api/frontend/analytics/retrain`

## Neon Tables (Auto-created)
When `DATABASE_URL` is set, backend auto-creates and syncs:
- `users`
- `crops`
- `fields`
- `scans`
- `pest_predictions`
- `weather_logs`
- `assistant_messages`
- `app_state` (JSON backup/state compatibility)

## ML Analytics Dataset
Backend can train analytics from your crop dataset and auto-populate:
- `yieldTrend` (month-wise actual vs predicted)
- `soilProfile` (Nitrogen, Phosphorus, Potassium, pH prediction)

### Supported files
Put one of these files in `server/data/`:
- `crop_yield_dataset.csv`
- `crop-yield-dataset.csv`
- `crop_yield_dataset.json`
- `crop-yield-dataset.json`

Or set custom path via env var:
- `YIELD_DATASET_PATH=path/to/your-file.csv`

### CSV columns (aliases supported)
Recommended columns:
- `date` or `month`
- `yield`
- `nitrogen`
- `phosphorus`
- `potassium`
- `ph`

### Train/retrain
- CLI: `npm run train:analytics`
- API: `POST /api/frontend/analytics/retrain`

## Pest Detection (OpenCV + Gemini Fallback)
Scanner flow now runs in this order:
1. Try OpenCV classification on local pest dataset
2. If confidence is low / unknown, fallback to Gemini API

### Dataset structure
Set `PEST_DATASET_DIR` (default: `server/data/pest_dataset`) like:

```text
data/pest_dataset/
  healthy/
    img1.jpg
    img2.jpg
  leaf_rust/
    img1.jpg
  blast_disease/
    img1.jpg
```

### Required Python deps
- `opencv-python`
- `numpy`

Example:
- `pip install opencv-python numpy`

### Optional env vars
- `PEST_DATASET_DIR=./data/pest_dataset`
- `PEST_PYTHON_BIN=python`
- `PEST_CV_MIN_CONFIDENCE=58`

## Dataset Starter Files
- CSV template: `data/templates/agri_dataset_template.csv`
- Collection checklist: `docs/data-collection-checklist.md`
