import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ quiet: true });

const { Pool } = pg;

const dbFile = path.resolve("data/db.json");
const databaseUrl = process.env.DATABASE_URL || "";
const wantsPostgres = Boolean(databaseUrl);
let usePostgresRuntime = wantsPostgres;

const shouldEnableSsl = () => {
  const lower = databaseUrl.toLowerCase();
  if (!lower) return false;
  if (lower.includes("localhost") || lower.includes("127.0.0.1")) return false;
  return true;
};

const normalizeDatabaseUrl = (rawUrl) => {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    const sslmode = parsed.searchParams.get("sslmode");
    if (sslmode && ["prefer", "require", "verify-ca"].includes(sslmode.toLowerCase())) {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

const resolvedDatabaseUrl = normalizeDatabaseUrl(databaseUrl);

const pool = wantsPostgres
  ? new Pool({
      connectionString: resolvedDatabaseUrl,
      ssl: shouldEnableSsl() ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 6000,
      idleTimeoutMillis: 10000,
    })
  : null;
let pgInitialized = false;

const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "57P01",
  "57P02",
  "57P03",
]);

const isRetryableError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  return RETRYABLE_ERROR_CODES.has(code);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withPgRetry = async (operation) => {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const canRetry = attempt < maxAttempts && isRetryableError(error);
      if (!canRetry) throw error;
      await sleep(400 * attempt);
    }
  }
};

const disablePostgres = (phase, error) => {
  if (!usePostgresRuntime) return;
  const code = error?.code ? ` (${error.code})` : "";
  console.warn(`[db] PostgreSQL unavailable during ${phase}${code}. Falling back to local JSON DB.`);
  usePostgresRuntime = false;
};

const defaultDbState = {
  farmers: [],
  crops: [],
  fields: [],
  fieldCrops: [],
  scans: [],
  weatherLogs: [],
  recentAlerts: [],
  fieldHealth: [],
  yieldTrend: [],
  soilProfile: [],
  mandiMarkets: [],
  coldStorages: [],
  assistantMessages: [],
  helpFaqs: [
    "Pest dikhe to pehla step kya karein?",
    "Mitti report samajhne ka easy tarika?",
    "Mandi rate low ho to kab bechein?",
  ],
};

const mergeDefaults = (current) => {
  const merged = { ...defaultDbState, ...(current || {}) };
  return merged;
};

const ensurePgState = async () => {
  if (!pool) return;

  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      village TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      season TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fields (
      id TEXT PRIMARY KEY,
      farmer_id TEXT,
      name TEXT NOT NULL,
      crop TEXT DEFAULT '',
      area_acre NUMERIC DEFAULT 0,
      area_label TEXT DEFAULT '',
      status TEXT DEFAULT '',
      health NUMERIC DEFAULT 0,
      alert TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL,
      CONSTRAINT fk_fields_farmer
        FOREIGN KEY(farmer_id)
        REFERENCES users(id)
        ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      farmer_id TEXT,
      field_id TEXT,
      image_data TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL,
      CONSTRAINT fk_scans_farmer
        FOREIGN KEY(farmer_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
      CONSTRAINT fk_scans_field
        FOREIGN KEY(field_id)
        REFERENCES fields(id)
        ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pest_predictions (
      id TEXT PRIMARY KEY,
      scan_id TEXT,
      pest_name TEXT DEFAULT '',
      disease_name TEXT DEFAULT '',
      risk TEXT DEFAULT '',
      confidence NUMERIC,
      summary TEXT DEFAULT '',
      actions JSONB DEFAULT '[]'::jsonb,
      raw_payload JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL,
      CONSTRAINT fk_pest_scan
        FOREIGN KEY(scan_id)
        REFERENCES scans(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weather_logs (
      id TEXT PRIMARY KEY,
      provider TEXT DEFAULT '',
      city TEXT DEFAULT '',
      lat NUMERIC,
      lon NUMERIC,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(
    `
    INSERT INTO app_state (id, data)
    VALUES (1, $1::jsonb)
    ON CONFLICT (id) DO NOTHING
  `,
    [JSON.stringify(defaultDbState)]
  );
};

const normalizeTimestamp = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const syncCoreTablesFromState = async (state) => {
  if (!pool) return;
  const data = mergeDefaults(state);

  await pool.query("BEGIN");
  try {
    await pool.query("TRUNCATE TABLE pest_predictions, scans, weather_logs, assistant_messages, fields, crops, users RESTART IDENTITY CASCADE");

    for (const user of data.farmers || []) {
      await pool.query(
        `INSERT INTO users (id, name, email, village, created_at) VALUES ($1,$2,$3,$4,$5)`,
        [
          String(user.id || `u_${Date.now()}`),
          String(user.name || "Farmer"),
          String(user.email || "").toLowerCase(),
          String(user.village || ""),
          normalizeTimestamp(user.createdAt),
        ]
      );
    }

    for (const crop of data.crops || []) {
      await pool.query(
        `INSERT INTO crops (id, name, season, created_at) VALUES ($1,$2,$3,$4)`,
        [
          String(crop.id || `c_${Date.now()}`),
          String(crop.name || ""),
          String(crop.season || ""),
          normalizeTimestamp(crop.createdAt),
        ]
      );
    }

    for (const field of data.fields || []) {
      const areaAcre =
        field.areaAcre !== undefined && field.areaAcre !== null
          ? Number(field.areaAcre || 0)
          : Number.parseFloat(String(field.area || "").replace(/[^\d.]/g, "")) || 0;
      await pool.query(
        `INSERT INTO fields (id, farmer_id, name, crop, area_acre, area_label, status, health, alert, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          String(field.id || `f_${Date.now()}`),
          field.farmerId ? String(field.farmerId) : null,
          String(field.name || ""),
          String(field.crop || ""),
          areaAcre,
          String(field.area || ""),
          String(field.status || ""),
          Number(field.health || 0),
          String(field.alert || ""),
          normalizeTimestamp(field.createdAt),
        ]
      );
    }

    for (const scan of data.scans || []) {
      await pool.query(
        `INSERT INTO scans (id, farmer_id, field_id, image_data, note, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          String(scan.id || `s_${Date.now()}`),
          scan.farmerId ? String(scan.farmerId) : null,
          scan.fieldId ? String(scan.fieldId) : null,
          String(scan.imageData || ""),
          String(scan.note || ""),
          normalizeTimestamp(scan.createdAt),
        ]
      );

      const hasPestData =
        scan.pestName || scan.diseaseName || scan.risk || scan.summary || scan.actions || scan.rawPayload;
      if (hasPestData) {
        await pool.query(
          `INSERT INTO pest_predictions (id, scan_id, pest_name, disease_name, risk, confidence, summary, actions, raw_payload, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)`,
          [
            String(scan.predictionId || `pp_${scan.id || Date.now()}`),
            String(scan.id || ""),
            String(scan.pestName || ""),
            String(scan.diseaseName || ""),
            String(scan.risk || ""),
            scan.confidence === null || scan.confidence === undefined ? null : Number(scan.confidence),
            String(scan.summary || ""),
            JSON.stringify(Array.isArray(scan.actions) ? scan.actions : []),
            JSON.stringify(scan.rawPayload || {}),
            normalizeTimestamp(scan.createdAt),
          ]
        );
      }
    }

    for (const log of data.weatherLogs || []) {
      await pool.query(
        `INSERT INTO weather_logs (id, provider, city, lat, lon, payload, created_at)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
        [
          String(log.id || `w_${Date.now()}`),
          String(log.provider || ""),
          String(log.request?.city || ""),
          log.request?.lat === undefined ? null : Number(log.request.lat),
          log.request?.lon === undefined ? null : Number(log.request.lon),
          JSON.stringify(log.payload || {}),
          normalizeTimestamp(log.createdAt),
        ]
      );
    }

    for (const message of data.assistantMessages || []) {
      await pool.query(
        `INSERT INTO assistant_messages (id, role, text, created_at) VALUES ($1,$2,$3,$4)`,
        [
          String(message.id || `m_${Date.now()}`),
          String(message.role || "user"),
          String(message.text || ""),
          normalizeTimestamp(message.createdAt),
        ]
      );
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
};

const ensureDb = async () => {
  if (usePostgresRuntime) {
    if (!pgInitialized) {
      try {
        await withPgRetry(() => ensurePgState());
        const result = await withPgRetry(() => pool.query("SELECT data FROM app_state WHERE id = 1 LIMIT 1"));
        const existingState = mergeDefaults(result.rows[0]?.data || {});
        await withPgRetry(() => syncCoreTablesFromState(existingState));
        pgInitialized = true;
      } catch (error) {
        disablePostgres("startup", error);
      }
    }
    if (usePostgresRuntime) return;
  }

  try {
    await fs.access(dbFile);
  } catch {
    const initial = { ...defaultDbState };
    await fs.writeFile(dbFile, JSON.stringify(initial, null, 2));
  }
};

export const readDb = async () => {
  await ensureDb();

  if (usePostgresRuntime) {
    try {
      const result = await withPgRetry(() => pool.query("SELECT data FROM app_state WHERE id = 1 LIMIT 1"));
      const parsed = result.rows[0]?.data || {};
      const hydrated = mergeDefaults(parsed);

      if (JSON.stringify(parsed) !== JSON.stringify(hydrated)) {
        await withPgRetry(() =>
          pool.query("UPDATE app_state SET data = $1::jsonb, updated_at = NOW() WHERE id = 1", [JSON.stringify(hydrated)])
        );
      }

      return hydrated;
    } catch (error) {
      disablePostgres("read", error);
      return readDb();
    }
  }

  const raw = await fs.readFile(dbFile, "utf-8");
  const parsed = JSON.parse(raw);
  const hydrated = mergeDefaults(parsed);

  if (JSON.stringify(parsed) !== JSON.stringify(hydrated)) {
    await fs.writeFile(dbFile, JSON.stringify(hydrated, null, 2));
  }

  return hydrated;
};

export const writeDb = async (data) => {
  await ensureDb();

  if (usePostgresRuntime) {
    try {
      const hydrated = mergeDefaults(data);
      await withPgRetry(() =>
        pool.query("UPDATE app_state SET data = $1::jsonb, updated_at = NOW() WHERE id = 1", [JSON.stringify(hydrated)])
      );
      await withPgRetry(() => syncCoreTablesFromState(hydrated));
      return;
    } catch (error) {
      disablePostgres("write", error);
      await ensureDb();
    }
  }

  await fs.writeFile(dbFile, JSON.stringify(data, null, 2));
};

export const isUsingPostgres = () => usePostgresRuntime;
export const initializeDatabase = async () => {
  await ensureDb();
};
