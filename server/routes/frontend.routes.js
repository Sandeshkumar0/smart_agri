import { Router } from "express";
import {
  getAnalyticsView,
  getAssistantView,
  getColdStorageView,
  getDashboardView,
  getDoctorView,
  getFieldsView,
  getLiveInsights,
  getHomeView,
  getMandiView,
  postCropSuggestion,
  getSoilEstimateByLocation,
  postAnalyticsRetrain,
  getWeatherView,
  postAssistantChat,
  postAssistantMessage,
} from "../controllers/frontend.controller.js";
import { withFallback } from "../utils/http.js";

const router = Router();

router.get(
  "/home",
  withFallback(getHomeView, {
    fallbackData: {
      hero: { title: "Smart Agri", subtitle: "AI-powered farming assistant" },
      features: [],
    },
    message: "Home fallback used",
  })
);
router.get(
  "/dashboard",
  withFallback(getDashboardView, {
    fallbackData: {
      stats: { totalFarmers: 0, totalFields: 0, healthyFields: 0, totalScans: 0, alertCount: 0 },
      recentAlerts: [],
      fieldHealth: [],
      yieldTrend: [],
      soilProfile: [],
      weather: null,
    },
    message: "Dashboard fallback used",
  })
);
router.get("/fields", withFallback(getFieldsView, { fallbackData: { items: [], crops: [] }, message: "Fields fallback used" }));
router.get("/doctor", withFallback(getDoctorView, { fallbackData: { recentScans: [] }, message: "Doctor fallback used" }));
router.get(
  "/assistant",
  withFallback(getAssistantView, {
    fallbackData: { faqs: [], messages: [] },
    message: "Assistant fallback used",
  })
);
router.post(
  "/assistant/messages",
  withFallback(postAssistantMessage, {
    status: 201,
    fallbackFactory: (req) => ({
      id: `fallback-msg-${Date.now()}`,
      role: req?.body?.role === "assistant" ? "assistant" : "user",
      text: String(req?.body?.text || ""),
      createdAt: new Date().toISOString(),
    }),
    message: "Assistant message fallback used",
  })
);
router.post(
  "/assistant/chat",
  withFallback(postAssistantChat, {
    fallbackFactory: (req) => {
      const text = String(req?.body?.text || "");
      return {
        user: {
          id: `fallback-user-${Date.now()}`,
          role: "user",
          text,
          createdAt: new Date().toISOString(),
        },
        assistant: {
          id: `fallback-ai-${Date.now()}`,
          role: "assistant",
          text: "Iske baare mein pakka pata nahi, KVK se poochho: 1800-180-1551",
          createdAt: new Date().toISOString(),
        },
        payload: { type: "normal", reply: "Iske baare mein pakka pata nahi, KVK se poochho: 1800-180-1551" },
      };
    },
    message: "Assistant chat fallback used",
  })
);
router.get("/weather", withFallback(getWeatherView, { fallbackData: { latest: null, logs: [] }, message: "Weather view fallback used" }));
router.get("/analytics", withFallback(getAnalyticsView, { fallbackData: { yieldTrend: [], soilProfile: [] }, message: "Analytics fallback used" }));
router.post(
  "/analytics/retrain",
  withFallback(postAnalyticsRetrain, {
    fallbackData: { message: "Retraining fallback used", yieldTrend: [], soilProfile: [], meta: {} },
    message: "Analytics retrain fallback used",
  })
);
router.get(
  "/soil/estimate",
  withFallback(getSoilEstimateByLocation, {
    fallbackData: { nitrogen: 68, phosphorus: 52, potassium: 61, ph: 6.5, source: "fallback" },
    message: "Soil estimate fallback used",
  })
);
router.post(
  "/crop/suggest",
  withFallback(postCropSuggestion, {
    fallbackData: {
      crop: "Mustard",
      score: 82,
      reason: "Fallback recommendation due service issue.",
      source: "dataset",
    },
    message: "Crop suggestion fallback used",
  })
);
router.get(
  "/live-insights",
  withFallback(getLiveInsights, {
    fallbackData: {
      expectedYieldTonPerAcre: 2.1,
      rainChance: 40,
      nitrogen: 68,
      phosphorus: 52,
      potassium: 61,
      ph: 6.5,
      location: "Kendujhar",
      advisory: { level: "ok", message: "AI advisory temporary unavailable. Quick safety check me major issue nahi mila." },
      source: "rules-fallback",
      updatedAt: new Date().toISOString(),
    },
    message: "Live insights fallback used",
  })
);
router.get("/mandi", withFallback(getMandiView, { fallbackData: { markets: [] }, message: "Mandi fallback used" }));
router.get(
  "/cold-storage",
  withFallback(getColdStorageView, { fallbackData: { storages: [] }, message: "Cold storage fallback used" })
);

export default router;
