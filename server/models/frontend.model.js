import { randomUUID } from "node:crypto";
import { readDb, writeDb } from "../config/db.js";
import { getAnalyticsPrediction } from "../services/analytics-ml.service.js";

const sortByCreatedAtDesc = (items = []) =>
  [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

export const getHomePayload = async () => ({
  hero: {
    title: "Smart Agri",
    subtitle: "AI-powered farming assistant",
  },
  features: [
    { id: "fields", label: "My Fields" },
    { id: "doctor", label: "Crop Doctor" },
    { id: "assistant", label: "AI Assistant" },
    { id: "weather", label: "Weather" },
    { id: "analytics", label: "Analytics" },
    { id: "mandi", label: "Mandi Price" },
    { id: "cold-storage", label: "Cold Storage" },
  ],
});

export const getDashboardPayload = async () => {
  const db = await readDb();
  const analytics = await getAnalyticsPrediction();
  const latestWeather = db.weatherLogs.at(-1)?.payload || null;
  const healthyFields = db.fields.filter((item) => item.status === "healthy").length;
  const alertCount = db.recentAlerts.length;

  return {
    stats: {
      totalFarmers: db.farmers.length,
      totalFields: db.fields.length,
      healthyFields,
      totalScans: db.scans.length,
      alertCount,
    },
    recentAlerts: sortByCreatedAtDesc(db.recentAlerts).slice(0, 8),
    fieldHealth: db.fieldHealth,
    yieldTrend: analytics.yieldTrend?.length ? analytics.yieldTrend : db.yieldTrend,
    soilProfile: analytics.soilProfile?.length ? analytics.soilProfile : db.soilProfile,
    weather: latestWeather,
  };
};

export const getFieldsPayload = async () => {
  const db = await readDb();
  return {
    items: db.fields,
    crops: db.crops,
  };
};

export const getDoctorPayload = async () => {
  const db = await readDb();
  return {
    recentScans: sortByCreatedAtDesc(db.scans).slice(0, 10),
  };
};

export const getAssistantPayload = async () => {
  const db = await readDb();
  return {
    faqs: db.helpFaqs,
    messages: sortByCreatedAtDesc(db.assistantMessages).slice(0, 20),
  };
};

export const getAssistantConversation = async (limit = 12) => {
  const db = await readDb();
  return [...db.assistantMessages]
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .slice(-limit);
};

export const createAssistantMessage = async ({ role, text }) => {
  const db = await readDb();
  const message = {
    id: `msg_${randomUUID()}`,
    role: role === "assistant" ? "assistant" : "user",
    text: String(text || "").trim(),
    createdAt: new Date().toISOString(),
  };

  db.assistantMessages.push(message);
  await writeDb(db);
  return message;
};

export const getWeatherPayload = async () => {
  const db = await readDb();
  const logs = sortByCreatedAtDesc(db.weatherLogs);
  return {
    latest: logs[0]?.payload || null,
    logs: logs.slice(0, 10),
  };
};

export const getAnalyticsPayload = async () => {
  const db = await readDb();
  const analytics = await getAnalyticsPrediction();
  return {
    yieldTrend: analytics.yieldTrend?.length ? analytics.yieldTrend : db.yieldTrend,
    soilProfile: analytics.soilProfile?.length ? analytics.soilProfile : db.soilProfile,
    meta: analytics.meta,
  };
};

export const getMandiPayload = async () => {
  const db = await readDb();
  return {
    markets: db.mandiMarkets,
  };
};

export const getColdStoragePayload = async () => {
  const db = await readDb();
  return {
    storages: db.coldStorages,
  };
};
