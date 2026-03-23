import {
  createAssistantMessage,
  getAssistantConversation,
  getAnalyticsPayload,
  getAssistantPayload,
  getColdStoragePayload,
  getDashboardPayload,
  getDoctorPayload,
  getFieldsPayload,
  getHomePayload,
  getMandiPayload,
  getWeatherPayload,
} from "../models/frontend.model.js";
import { env } from "../config/env.js";
import { generateFarmAiReply } from "../services/farmai-chat.service.js";
import { trainAnalyticsModel } from "../services/analytics-ml.service.js";
import { fetchForecast10Days } from "../services/weather.service.js";
import { apiError, apiResponse } from "../utils/http.js";

export const getHomeView = async (_req, res) => {
  const payload = await getHomePayload();
  return apiResponse(res, 200, payload);
};

export const getDashboardView = async (_req, res) => {
  const payload = await getDashboardPayload();
  return apiResponse(res, 200, payload);
};

export const getFieldsView = async (_req, res) => {
  const payload = await getFieldsPayload();
  return apiResponse(res, 200, payload);
};

export const getDoctorView = async (_req, res) => {
  const payload = await getDoctorPayload();
  return apiResponse(res, 200, payload);
};

export const getAssistantView = async (_req, res) => {
  const payload = await getAssistantPayload();
  return apiResponse(res, 200, payload);
};

export const postAssistantMessage = async (req, res) => {
  const { role, text } = req.body || {};
  if (!text || !String(text).trim()) {
    return apiError(res, 400, "text is required");
  }

  const message = await createAssistantMessage({ role, text });
  return apiResponse(res, 201, message);
};

const sanitizeAssistantText = (value) =>
  String(value || "")
    .replace(/[^\r\n\t\x20-\x7E\u0900-\u097F]/g, " ")
    .replace(/\?{2,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

const canonicalAssistantType = (value = "") => {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!raw) return "";
  if (raw === "pest" || raw.includes("keeda")) return "pest";
  if (raw === "irrigation" || raw.includes("paani")) return "irrigation";
  if (raw === "fertilizer" || raw.includes("khad")) return "fertilizer";
  if (raw === "crop_guide" || raw === "cropguide" || raw.includes("guide")) return "crop_guide";
  if (raw === "scheme" || raw.includes("yojana")) return "scheme";
  if (raw === "normal" || raw === "general") return "normal";
  return raw;
};

const formatFarmAiText = (obj) => {
  const type = canonicalAssistantType(obj?.type);
  if (type === "normal") {
    return sanitizeAssistantText(obj.reply || obj.message || obj.text || "Namaste. Main FarmAI hoon.");
  }

  if (type === "pest") {
    return [
      `Keeda: ${obj.keeda_naam || "-"}`,
      `Khatra: ${obj.khatra || "-"}`,
      `Kya hua: ${obj.kya_hua || "-"}`,
      `Kya karo: ${(obj.kya_karo || []).join(" | ") || "-"}`,
      `Dawa: ${obj.dawa || "-"}`,
    ]
      .map(sanitizeAssistantText)
      .join("\n");
  }

  if (type === "irrigation") {
    return [
      `Fasal: ${obj.fasal || "-"}`,
      `Kab paani: ${obj.kab_paani || "-"}`,
      `Kitna paani: ${obj.kitna_paani || "-"}`,
      `Tips: ${(obj.tips || []).join(" | ") || "-"}`,
    ]
      .map(sanitizeAssistantText)
      .join("\n");
  }

  if (type === "fertilizer") {
    const list = Array.isArray(obj.khad_list)
      ? obj.khad_list.map((item) => `${item.naam}: ${item.maatra} (${item.kab})`).join(" | ")
      : "-";

    return [`Fasal: ${obj.fasal || "-"}`, `Khad plan: ${list}`, `Savdhaani: ${obj.savdhaani || "-"}`]
      .map(sanitizeAssistantText)
      .join("\n");
  }

  if (type === "crop_guide") {
    const stepText = Array.isArray(obj.steps)
      ? obj.steps.map((item) => `${item.step}: ${item.detail}`).slice(0, 4).join(" | ")
      : "-";

    return [
      `Fasal: ${obj.fasal || "-"}`,
      `Season: ${obj.season || "-"}`,
      `Steps: ${stepText}`,
      `Expected: ${obj.kitna_milega || "-"}`,
    ]
      .map(sanitizeAssistantText)
      .join("\n");
  }

  if (type === "scheme") {
    return [
      `Yojana: ${obj.scheme_naam || "-"}`,
      `Kya milega: ${obj.kya_milega || "-"}`,
      `Eligibility: ${obj.kaun_le_sakta || "-"}`,
      `Apply: ${(obj.kaise_apply || []).join(" | ") || "-"}`,
      `Helpline: ${obj.helpline || "1800-180-1551"}`,
    ]
      .map(sanitizeAssistantText)
      .join("\n");
  }

  return sanitizeAssistantText(obj?.reply || obj?.message || obj?.text || "Thoda detail se pucho, main madad karta hoon.");
};

export const postAssistantChat = async (req, res) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) {
    return apiError(res, 400, "text is required");
  }

  const userMessage = await createAssistantMessage({ role: "user", text });
  const history = await getAssistantConversation(12);
  const aiPayload = await generateFarmAiReply({ text, history });
  const aiText = formatFarmAiText(aiPayload);
  const assistantMessage = await createAssistantMessage({ role: "assistant", text: aiText });

  return apiResponse(res, 200, {
    user: userMessage,
    assistant: assistantMessage,
    payload: aiPayload,
  });
};

export const getWeatherView = async (_req, res) => {
  const payload = await getWeatherPayload();
  return apiResponse(res, 200, payload);
};

export const getAnalyticsView = async (_req, res) => {
  const payload = await getAnalyticsPayload();
  return apiResponse(res, 200, payload);
};

export const postAnalyticsRetrain = async (_req, res) => {
  const payload = await trainAnalyticsModel({ force: true, persist: true });
  return apiResponse(res, 200, {
    message: "Analytics model retrained successfully",
    ...payload,
  });
};

export const getSoilEstimateByLocation = async (req, res) => {
  const lat = Number(req.query?.lat);
  const lon = Number(req.query?.lon);
  const city = String(req.query?.city || "").trim();

  const analytics = await trainAnalyticsModel({ force: false, persist: false });
  const profile = Array.isArray(analytics?.soilProfile) ? analytics.soilProfile : [];
  const base = {
    nitrogen: Number(profile.find((item) => item.name === "Nitrogen")?.value || 68),
    phosphorus: Number(profile.find((item) => item.name === "Phosphorus")?.value || 52),
    potassium: Number(profile.find((item) => item.name === "Potassium")?.value || 61),
    ph: Number(profile.find((item) => item.name === "pH Level")?.value || 65) / 10,
  };

  const latSafe = Number.isFinite(lat) ? lat : 0;
  const lonSafe = Number.isFinite(lon) ? lon : 0;
  const cityWeight = city
    ? [...city.toLowerCase()].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 10
    : 0;
  const offset = ((((Math.abs(latSafe) + Math.abs(lonSafe) + cityWeight) % 1) - 0.5) * 4);
  let rainfallChance = null;

  try {
    const weather = await fetchForecast10Days({ city: city || undefined, lat: Number.isFinite(lat) ? lat : undefined, lon: Number.isFinite(lon) ? lon : undefined });
    const firstThree = Array.isArray(weather?.daily) ? weather.daily.slice(0, 3) : [];
    if (firstThree.length > 0) {
      rainfallChance = Math.round(
        firstThree.reduce((sum, day) => sum + Number(day?.rainChance || 0), 0) / firstThree.length
      );
    }
  } catch {
    rainfallChance = null;
  }

  return apiResponse(res, 200, {
    nitrogen: Math.max(0, Math.min(100, Math.round(base.nitrogen + offset))),
    phosphorus: Math.max(0, Math.min(100, Math.round(base.phosphorus + offset / 2))),
    potassium: Math.max(0, Math.min(100, Math.round(base.potassium - offset / 2))),
    ph: Math.max(5, Math.min(8.5, Number((base.ph + offset / 20).toFixed(2)))),
    rainfallChance,
    source: analytics?.meta?.source || "fallback",
  });
};

const heuristicCropSuggestion = ({ soil = {}, rainfallChance = 40 }) => {
  const n = Number(soil.nitrogen || 0);
  const p = Number(soil.phosphorus || 0);
  const k = Number(soil.potassium || 0);
  const ph = Number(soil.ph || 6.5);

  if (n >= 70 && rainfallChance >= 55 && ph >= 6.2 && ph <= 7.6) {
    return { crop: "Rice", score: 95, reason: "High nitrogen + favorable rainfall window." };
  }
  if (n >= 55 && p >= 40 && rainfallChance <= 50 && ph >= 6 && ph <= 7.8) {
    return { crop: "Wheat", score: 91, reason: "Balanced N-P support with moderate rain risk." };
  }
  if (k >= 55 && rainfallChance <= 40) {
    return { crop: "Maize", score: 88, reason: "Potassium-rich soil and lower expected rain." };
  }

  return { crop: "Mustard", score: 82, reason: "Stable fallback for uncertain soil-rain profile." };
};

const parseSuggestionJson = (text = "") => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const callGroqJsonPrompt = async ({ prompt, parser }) => {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.groqApiKey}`,
    },
    body: JSON.stringify({
      model: env.groqModel,
      messages: [
        { role: "system", content: "Return strict JSON only. No markdown." },
        { role: "user", content: String(prompt || "") },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = err?.error?.message || `Groq failed (${response.status})`;
    throw new Error(detail);
  }

  const payload = await response.json();
  const raw = String(payload?.choices?.[0]?.message?.content || "").trim();
  const parsed = typeof parser === "function" ? parser(raw) : parseJsonLoose(raw);
  return { parsed, raw };
};

export const postCropSuggestion = async (req, res) => {
  const soil = req.body?.soil || {};
  const rainfallChance = Number(req.body?.rainfallChance || 40);
  const season = String(req.body?.season || "kharif");
  const previousCrops = Array.isArray(req.body?.previousCrops) ? req.body.previousCrops : [];

  const prompt = `
Return JSON only:
{
  "crop": "string",
  "score": number,
  "reason": "short practical reason in Hinglish"
}
Input:
- Soil N: ${Number(soil.nitrogen || 0)}
- Soil P: ${Number(soil.phosphorus || 0)}
- Soil K: ${Number(soil.potassium || 0)}
- pH: ${Number(soil.ph || 6.5)}
- Rain chance (%): ${rainfallChance}
- Season: ${season}
- Previous crops: ${previousCrops.join(", ") || "none"}
  `.trim();

  if (env.groqApiKey) {
    try {
      const { parsed } = await callGroqJsonPrompt({ prompt, parser: parseSuggestionJson });
      if (parsed?.crop) {
        return apiResponse(res, 200, {
          crop: String(parsed.crop),
          score: Number(parsed.score || 80),
          reason: String(parsed.reason || "Groq suggested based on soil and rainfall."),
          source: "groq",
        });
      }
    } catch {
      // fallback to dataset heuristic below
    }
  }

  const suggested = heuristicCropSuggestion({ soil, rainfallChance });
  return apiResponse(res, 200, {
    ...suggested,
    source: "dataset",
  });
};

const parseJsonLoose = (text = "") => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const getSoilValue = (soilProfile = [], label, fallback = 0) => {
  const row = (soilProfile || []).find((item) => String(item?.name || "").toLowerCase() === label.toLowerCase());
  const value = Number(row?.value);
  return Number.isFinite(value) ? value : fallback;
};

export const getLiveInsights = async (req, res) => {
  const fertilizer = String(req.query?.fertilizer || "None");
  const pesticide = String(req.query?.pesticide || "None");
  const location = String(req.query?.location || "Kendujhar").trim();
  const lat = Number(req.query?.lat);
  const lon = Number(req.query?.lon);
  const soilNInput = Number(req.query?.soil_n);
  const soilPInput = Number(req.query?.soil_p);
  const soilKInput = Number(req.query?.soil_k);
  const soilPhInput = Number(req.query?.soil_ph);

  const analytics = await trainAnalyticsModel({ force: false, persist: false });
  const yieldTrend = Array.isArray(analytics?.yieldTrend) ? analytics.yieldTrend : [];
  const soilProfile = Array.isArray(analytics?.soilProfile) ? analytics.soilProfile : [];
  const lastTrend = yieldTrend[yieldTrend.length - 1] || null;
  const baseYield = Number(lastTrend?.predicted ?? lastTrend?.actual ?? 0);

  let weather = null;
  let rainChance = 40;
  let weatherSource = "openweather";
  try {
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
    weather = hasCoords
      ? await fetchForecast10Days({ lat, lon })
      : await fetchForecast10Days({ city: location || "Kendujhar" });
    const firstThree = Array.isArray(weather?.daily) ? weather.daily.slice(0, 3) : [];
    if (firstThree.length > 0) {
      rainChance = Math.round(
        firstThree.reduce((sum, day) => sum + Number(day?.rainChance || 0), 0) / firstThree.length
      );
    }
  } catch {
    rainChance = 40;
    weatherSource = "fallback-default";
  }

  const datasetNitrogen = getSoilValue(soilProfile, "Nitrogen", 68);
  const datasetPhosphorus = getSoilValue(soilProfile, "Phosphorus", 52);
  const datasetPotassium = getSoilValue(soilProfile, "Potassium", 61);
  const datasetPh = getSoilValue(soilProfile, "pH Level", 65) / 10;

  const nitrogen = Number.isFinite(soilNInput) ? soilNInput : datasetNitrogen;
  const phosphorus = Number.isFinite(soilPInput) ? soilPInput : datasetPhosphorus;
  const potassium = Number.isFinite(soilKInput) ? soilKInput : datasetPotassium;
  const ph = Number.isFinite(soilPhInput) ? soilPhInput : datasetPh;
  const soilSource =
    Number.isFinite(soilNInput) ||
    Number.isFinite(soilPInput) ||
    Number.isFinite(soilKInput) ||
    Number.isFinite(soilPhInput)
      ? "farmer-input"
      : "dataset";

  const fertilizerLower = fertilizer.toLowerCase();
  const heuristicYield = (() => {
    if (Number.isFinite(baseYield) && baseYield > 0) {
      let adjustedYield = baseYield;
      if (rainChance > 75) adjustedYield *= 0.94;
      if (rainChance >= 45 && rainChance <= 65) adjustedYield *= 1.03;
      if (nitrogen >= 70 && fertilizerLower === "urea") adjustedYield *= 0.98;
      if (ph < 5.8 || ph > 8.2) adjustedYield *= 0.96;
      return Number(adjustedYield.toFixed(2));
    }

    let score = 2.1;
    if (rainChance >= 45 && rainChance <= 65) score += 0.18;
    if (rainChance > 80) score -= 0.22;
    if (nitrogen >= 45 && nitrogen <= 75) score += 0.12;
    if (ph < 5.8 || ph > 8.2) score -= 0.16;
    return Number(Math.max(1.2, Math.min(4.5, score)).toFixed(2));
  })();

  const ruleAdvisory = (() => {
    if (fertilizerLower === "urea" && nitrogen >= 70) {
      return {
        level: "warning",
        message: `Warning: N high (${nitrogen}). Urea kam karein ya skip karein.`,
      };
    }
    if (ph < 5.8) {
      return {
        level: "warning",
        message: `Soil pH low (${Number(ph.toFixed(2))}). Lime-based correction consider karein.`,
      };
    }
    if (ph > 8.2) {
      return {
        level: "warning",
        message: `Soil pH high (${Number(ph.toFixed(2))}). Sulfur/organic matter se pH balance karein.`,
      };
    }
    if (phosphorus < 25) {
      return {
        level: "warning",
        message: `Phosphorus low (${phosphorus}). DAP/SSP dose agronomist advice ke saath adjust karein.`,
      };
    }
    return {
      level: "ok",
      message: "Quick safety check: major nutrient conflict detect nahi hua.",
    };
  })();

  const prompt = `
Return JSON only:
{
  "expectedYieldTonPerAcre": number,
  "advisoryLevel": "ok|warning",
  "advisoryMessage": "short practical Hinglish message"
}
Inputs:
location=${location}
rainChance=${rainChance}
nitrogen=${nitrogen}
phosphorus=${phosphorus}
potassium=${potassium}
ph=${ph}
fertilizer=${fertilizer}
pesticide=${pesticide}
fallbackExpectedYield=${heuristicYield}
  `.trim();

  if (env.groqApiKey) {
    try {
      const { parsed } = await callGroqJsonPrompt({ prompt, parser: parseJsonLoose });
      if (parsed?.advisoryMessage || parsed?.expectedYieldTonPerAcre) {
        const aiYield = Number(parsed.expectedYieldTonPerAcre);
        const expectedYieldTonPerAcre = Number.isFinite(aiYield) && aiYield > 0 ? aiYield : heuristicYield;
        return apiResponse(res, 200, {
          expectedYieldTonPerAcre: Number(expectedYieldTonPerAcre.toFixed(2)),
          rainChance,
          nitrogen,
          phosphorus,
          potassium,
          ph: Number(ph.toFixed(2)),
          fertilizer,
          pesticide,
          location: weather?.location || location,
          advisory: {
            level: String(parsed.advisoryLevel || ruleAdvisory.level),
            message: String(parsed.advisoryMessage || ruleAdvisory.message),
          },
          source: "ai",
          sources: {
            soil: soilSource,
            weather: weatherSource,
            farmInput: "user-selection",
            yieldEngine: "groq-ai",
          },
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // fallback below
    }
  }

  return apiResponse(res, 200, {
    expectedYieldTonPerAcre: heuristicYield,
    rainChance,
    nitrogen,
    phosphorus,
    potassium,
    ph: Number(ph.toFixed(2)),
    fertilizer,
    pesticide,
    location: weather?.location || location,
    advisory: ruleAdvisory,
    source: "rules-fallback",
    sources: {
      soil: soilSource,
      weather: weatherSource,
      farmInput: "user-selection",
      yieldEngine: "rules-fallback",
    },
    updatedAt: new Date().toISOString(),
  });
};

export const getMandiView = async (_req, res) => {
  const payload = await getMandiPayload();
  return apiResponse(res, 200, payload);
};

export const getColdStorageView = async (_req, res) => {
  const payload = await getColdStoragePayload();
  return apiResponse(res, 200, payload);
};
