import { createScan, listScans } from "../models/scan.model.js";
import { detectPestFromImage } from "../services/pest-detect.service.js";
import { readDb, writeDb } from "../config/db.js";
import { apiError, apiResponse } from "../utils/http.js";

export const getScans = async (_req, res) => {
  const scans = await listScans();
  return apiResponse(res, 200, { items: scans });
};

export const addScan = async (req, res) => {
  const { farmerId, fieldId, imageData, note } = req.body || {};
  if (!farmerId || !imageData) {
    return apiError(res, 400, "farmerId and imageData are required");
  }

  const scan = await createScan({ farmerId, fieldId, imageData, note });
  return apiResponse(res, 201, scan);
};

export const detectPest = async (req, res) => {
  const { imageData } = req.body || {};
  const cropName = String(req.body?.cropName || "").trim();
  if (!imageData || !String(imageData).trim()) {
    return apiError(res, 400, "imageData is required");
  }

  try {
    const result = await detectPestFromImage(imageData);

    if (result?.pestDetected) {
      const db = await readDb();
      const risk = String(result?.risk || "").toLowerCase();
      const severity = risk === "high" ? "critical" : risk === "med" || risk === "medium" ? "warning" : "info";
      const alert = {
        id: `alert_${Date.now()}`,
        severity,
        message: `${String(result?.diseaseName || "Pest issue")} detected in ${cropName || "selected crop"} - ${severity === "critical" ? "immediate treatment required" : "monitor closely"}`,
        field: cropName || "Selected Crop",
        time: "just now",
        createdAt: new Date().toISOString(),
      };
      db.recentAlerts = [alert, ...(Array.isArray(db.recentAlerts) ? db.recentAlerts : [])].slice(0, 50);
      await writeDb(db);
    }

    return apiResponse(res, 200, result);
  } catch (error) {
    return apiResponse(res, 200, {
      pestDetected: false,
      pestName: "Pakka nahi dikh raha",
      diseaseName: "Unknown",
      risk: "low",
      confidence: null,
      summary: "Image clear nahi tha ya service busy hai.",
      actions: ["Photo clear light me lo", "Patte ulat kar check karo", "KVK se salah lo: 1800-180-1551"],
      farmerResponse:
        "🐛 Keeda: Pakka nahi dikh raha\n⚠️ Khatra: Kam\n🌱 Kya hua: Image clear nahi tha ya service busy hai.\n✅ Kya karo: Photo clear light me lo | Patte ulat kar check karo | KVK se salah lo: 1800-180-1551",
      model: "fallback",
      _fallback: true,
      _error: error?.message || "pest detection failed",
    });
  }
};
