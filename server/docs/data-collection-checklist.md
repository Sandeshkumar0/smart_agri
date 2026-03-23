# Data Collection Checklist (Model v2)

## 1) Unit and Grain
- One row = one field (`field_id`) for one crop season.
- Do not mix multiple fields in one row.
- Keep `field_id` stable across seasons.

## 2) Mandatory Fields
- `field_id`, `farm_id`
- `crop`, `variety`
- `state`, `district`, `latitude`, `longitude`
- `season`, `sowing_date`, `harvest_date`
- `area_acre`
- `N`, `P`, `K`, `ph`
- `rainfall_total_mm`, `avg_temp_c`, `humidity_avg`
- `fertilizer_total_kg_per_acre`, `pesticide_spray_count`
- `yield_ton_per_acre`
- `recorded_at`

## 3) Highly Recommended Fields
- Soil: `organic_carbon`, `ec`, `cec`, `soil_texture`, `zinc`, `iron`, `sulfur`, `boron`
- Water: `irrigation_method`, `irrigation_count`, `irrigation_water_mm`
- Weather detail: `rainy_days`, `min_temp_c`, `max_temp_c`, `wind_speed_kmph`, `solar_radiation_mj_m2`
- Crop stress: `pest_incidence_pct`, `disease_severity_pct`
- Economics: `market_price_inr_per_quintal`, `input_cost_inr_per_acre`, `profit_inr_per_acre`

## 4) Data Quality Rules
- Dates must be ISO format: `YYYY-MM-DD`.
- Numeric fields must be plain numbers (no units inside cell).
- Missing numeric values: keep blank, do not put text like `NA?`.
- `ph` range should be 0 to 14.
- Percent fields should be 0 to 100.
- `yield_ton_per_acre` must be > 0.
- `latitude` range: -90 to 90; `longitude`: -180 to 180.

## 5) Collection Frequency
- Soil lab profile: every season (at least pre-sowing).
- Weather aggregates: weekly and season-final totals.
- Irrigation/fertilizer/pesticide logs: event-wise (same day entry).
- Pest/disease severity: weekly scouting.
- Yield: once at harvest.

## 6) Suggested Sources
- Soil lab reports
- Weather station/API (farm-nearest)
- Farmer activity logs / mobile app forms
- Procurement and mandi records

## 7) Train/Update Workflow
1. Copy final CSV to `server/data/crop_yield_dataset.csv`.
2. Run `npm run train:analytics`.
3. Or call `POST /api/frontend/analytics/retrain`.
4. Verify response from `GET /api/frontend/analytics`.

## 8) Current Backend Notes
- Default training crop is Wheat (`ANALYTICS_CROP=Wheat`).
- To train another crop, set `ANALYTICS_CROP=Rice` (or other crop name).
