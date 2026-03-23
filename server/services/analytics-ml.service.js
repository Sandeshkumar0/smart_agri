import fs from "node:fs/promises";
import path from "node:path";
import { readDb, writeDb } from "../config/db.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SOIL_COLORS = {
  nitrogen: "#52B788",
  phosphorus: "#E9A15F",
  potassium: "#3C78D8",
  ph: "#6D3FD8",
};

const FIELD_ALIASES = {
  yield: ["yield", "cropyield", "crop_yield", "yieldtonperacre", "yield_ton_per_acre", "yieldtonnesperacre", "production", "actualyield"],
  date: ["date", "recordedat", "recorded_at", "timestamp", "createdat", "harvestdate", "harvest_date", "sowingdate", "sowing_date"],
  month: ["month", "monthname", "month_name", "mnth"],
  cropYear: ["cropyear", "crop_year", "year", "seasonyear"],
  crop: ["crop", "cropname", "crop_name", "commodity"],
  nitrogen: ["nitrogen", "n", "soilnitrogen", "soil_nitrogen", "nlevel", "n_level"],
  phosphorus: ["phosphorus", "p", "soilphosphorus", "soil_phosphorus", "plevel", "p_level"],
  potassium: ["potassium", "k", "soilpotassium", "soil_potassium", "klevel", "k_level"],
  ph: ["ph", "phlevel", "ph_level", "soilph", "soil_ph"],
};

let cache = {
  signature: "",
  payload: null,
};

const normalizeKey = (key) =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeRow = (row) => {
  const normalized = {};
  for (const [key, value] of Object.entries(row || {})) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
};

const parseNumeric = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const cleaned = text.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
};

const findByAliases = (row, aliases) => {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return null;
};

const parseCsvLine = (line) => {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  cells.push(current.trim());
  return cells;
};

const parseCsv = (raw) => {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const row = {};

    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = cells[j] ?? "";
    }

    rows.push(row);
  }

  return rows;
};

const extractJsonRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
};

const getDatasetCandidates = () => {
  const explicit = process.env.YIELD_DATASET_PATH ? [process.env.YIELD_DATASET_PATH] : [];
  return [
    ...explicit,
    "data/crop_yield_dataset.csv",
    "data/crop-yield-dataset.csv",
    "data/crop_yield_dataset.json",
    "data/crop-yield-dataset.json",
    "data/yield_dataset.csv",
    "data/yield_dataset.json",
  ];
};

const findDatasetFile = async () => {
  const candidates = getDatasetCandidates();

  for (const file of candidates) {
    const fullPath = path.resolve(file);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) return fullPath;
    } catch {
      // ignore candidate miss
    }
  }

  return null;
};

const loadDatasetRows = async () => {
  const filePath = await findDatasetFile();
  if (!filePath) {
    return { filePath: null, signature: "", rows: [] };
  }

  const stat = await fs.stat(filePath);
  const signature = `${filePath}|${stat.size}|${stat.mtimeMs}`;
  const ext = path.extname(filePath).toLowerCase();
  const raw = await fs.readFile(filePath, "utf-8");

  if (ext === ".json") {
    const parsed = JSON.parse(raw);
    const rows = extractJsonRows(parsed).map(normalizeRow);
    return { filePath, signature, rows };
  }

  const rows = parseCsv(raw).map(normalizeRow);
  return { filePath, signature, rows };
};

const monthLabelFromRow = (row, fallbackIndex) => {
  const dateValue = findByAliases(row, FIELD_ALIASES.date);
  if (dateValue) {
    const date = new Date(String(dateValue));
    if (!Number.isNaN(date.getTime())) {
      return MONTHS[date.getMonth()];
    }
  }

  const monthValue = findByAliases(row, FIELD_ALIASES.month);
  if (monthValue !== null && monthValue !== undefined && monthValue !== "") {
    const monthText = String(monthValue).trim();
    const numeric = Number(monthText);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
      return MONTHS[numeric - 1];
    }

    const normalized = monthText.slice(0, 3).toLowerCase();
    const index = MONTHS.findIndex((item) => item.toLowerCase() === normalized);
    if (index >= 0) return MONTHS[index];
  }

  return `M${fallbackIndex + 1}`;
};

const linearRegression = (points) => {
  const n = points.length;
  if (!n) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (!denominator) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const buildYieldTrend = (rows) => {
  const timeline = [];
  let hasMonthOrDate = false;
  let hasCropYear = false;

  const buildYearTrend = (records) => {
    const yearBuckets = new Map();
    for (const entry of records) {
      if (!Number.isFinite(entry.cropYear)) continue;
      if (!yearBuckets.has(entry.cropYear)) {
        yearBuckets.set(entry.cropYear, []);
      }
      yearBuckets.get(entry.cropYear).push(entry.actual);
    }

    const allYearStats = [...yearBuckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, values]) => ({
        year,
        count: values.length,
        mean: values.reduce((a, b) => a + b, 0) / values.length,
      }));

    const filteredYearStats = allYearStats.filter((item) => item.count >= 5);
    const sourceYearStats = filteredYearStats.length ? filteredYearStats : allYearStats;

    const aggregatedByYear = sourceYearStats
      .map((item) => ({
        month: String(item.year),
        actual: item.mean,
      }))
      .slice(-12);

    const points = aggregatedByYear.map((item, index) => ({ x: index, y: item.actual }));
    const model = linearRegression(points);

    return aggregatedByYear.map((item, index) => ({
      month: item.month,
      actual: round(item.actual, 2),
      predicted: round(model.intercept + model.slope * index, 2),
    }));
  };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const yieldValue = parseNumeric(findByAliases(row, FIELD_ALIASES.yield));
    if (yieldValue === null) continue;

    const dateValue = findByAliases(row, FIELD_ALIASES.date);
    const monthValue = findByAliases(row, FIELD_ALIASES.month);
    const cropYearValue = parseNumeric(findByAliases(row, FIELD_ALIASES.cropYear));

    if (dateValue || monthValue) hasMonthOrDate = true;
    if (cropYearValue !== null) hasCropYear = true;

    timeline.push({
      month: monthLabelFromRow(row, i),
      actual: yieldValue,
      cropYear: cropYearValue,
    });
  }

  if (!timeline.length) return [];

  if (!hasMonthOrDate && hasCropYear) {
    return buildYearTrend(timeline);
  }

  const buckets = new Map();
  for (const entry of timeline) {
    if (!buckets.has(entry.month)) {
      buckets.set(entry.month, []);
    }
    buckets.get(entry.month).push(entry.actual);
  }

  const aggregated = [...buckets.entries()]
    .map(([month, values]) => ({
      month,
      actual: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .slice(-12);

  if (aggregated.length < 4 && hasCropYear) {
    return buildYearTrend(timeline);
  }

  const points = aggregated.map((item, index) => ({ x: index, y: item.actual }));
  const model = linearRegression(points);

  return aggregated.map((item, index) => ({
    month: item.month,
    actual: round(item.actual, 2),
    predicted: round(model.intercept + model.slope * index, 2),
  }));
};

const predictNextValue = (series = []) => {
  if (!series.length) return null;
  if (series.length === 1) return series[0];

  const points = series.map((value, index) => ({ x: index, y: value }));
  const model = linearRegression(points);
  return model.intercept + model.slope * series.length;
};

const toPercent = (value, { isPh = false } = {}) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;

  let scaled = value;
  if (isPh && scaled <= 14) {
    scaled *= 10;
  }

  if (!isPh && scaled <= 1) {
    scaled *= 100;
  }

  const clamped = Math.max(0, Math.min(100, scaled));
  return Math.round(clamped);
};

const collectSeries = (rows, aliases) => {
  const values = [];
  for (const row of rows) {
    const value = parseNumeric(findByAliases(row, aliases));
    if (value !== null) {
      values.push(value);
    }
  }
  return values;
};

const filterRowsByCrop = (rows) => {
  const cropTarget = String(process.env.ANALYTICS_CROP || "Wheat").trim().toLowerCase();
  if (!cropTarget) return { rows, crop: null };

  const filtered = rows.filter((row) => {
    const cropValue = findByAliases(row, FIELD_ALIASES.crop);
    if (cropValue === null || cropValue === undefined) return false;
    return String(cropValue).toLowerCase().includes(cropTarget);
  });

  if (filtered.length >= 10) {
    return { rows: filtered, crop: cropTarget };
  }

  return { rows, crop: null };
};

const buildSoilProfile = (rows) => {
  const nitrogenSeries = collectSeries(rows, FIELD_ALIASES.nitrogen);
  const phosphorusSeries = collectSeries(rows, FIELD_ALIASES.phosphorus);
  const potassiumSeries = collectSeries(rows, FIELD_ALIASES.potassium);
  const phSeries = collectSeries(rows, FIELD_ALIASES.ph);

  const nitrogen = toPercent(predictNextValue(nitrogenSeries));
  const phosphorus = toPercent(predictNextValue(phosphorusSeries));
  const potassium = toPercent(predictNextValue(potassiumSeries));
  const ph = toPercent(predictNextValue(phSeries), { isPh: true });

  const profile = [
    { name: "Nitrogen", value: nitrogen ?? 0, color: SOIL_COLORS.nitrogen },
    { name: "Phosphorus", value: phosphorus ?? 0, color: SOIL_COLORS.phosphorus },
    { name: "Potassium", value: potassium ?? 0, color: SOIL_COLORS.potassium },
    { name: "pH Level", value: ph ?? 0, color: SOIL_COLORS.ph },
  ];

  return profile;
};

const buildFallbackFromDb = async () => {
  const db = await readDb();
  return {
    yieldTrend: Array.isArray(db.yieldTrend) ? db.yieldTrend : [],
    soilProfile: Array.isArray(db.soilProfile) ? db.soilProfile : [],
    meta: {
      source: "db",
      filePath: null,
      trainedAt: new Date().toISOString(),
      rowCount: 0,
    },
  };
};

export const trainAnalyticsModel = async ({ force = false, persist = true } = {}) => {
  const dataset = await loadDatasetRows();

  if (!dataset.filePath || !dataset.rows.length) {
    return buildFallbackFromDb();
  }

  if (!force && cache.payload && cache.signature === dataset.signature) {
    return cache.payload;
  }

  const { rows: modelRows, crop } = filterRowsByCrop(dataset.rows);
  const yieldTrend = buildYieldTrend(modelRows);
  const soilProfile = buildSoilProfile(modelRows);

  const payload = {
    yieldTrend,
    soilProfile,
    meta: {
      source: "dataset",
      filePath: dataset.filePath,
      trainedAt: new Date().toISOString(),
      rowCount: modelRows.length,
      totalRowCount: dataset.rows.length,
      cropFilter: crop,
    },
  };

  if (persist) {
    const db = await readDb();
    db.yieldTrend = yieldTrend;
    db.soilProfile = soilProfile;
    await writeDb(db);
  }

  cache = {
    signature: dataset.signature,
    payload,
  };

  return payload;
};

export const getAnalyticsPrediction = async () => trainAnalyticsModel({ force: false, persist: true });
