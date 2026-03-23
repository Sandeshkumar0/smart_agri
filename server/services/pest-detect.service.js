import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { env } from "../config/env.js";

const PYTHON_BIN = process.env.PEST_PYTHON_BIN || "python";
const DATASET_DIR = path.resolve(process.env.PEST_DATASET_DIR || "data/pest_dataset");
const CV_MIN_CONFIDENCE = Number(process.env.PEST_CV_MIN_CONFIDENCE || 58);

const stripDataUrlPrefix = (value = "") => {
  const text = String(value || "");
  const match = text.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return { mimeType: "image/jpeg", base64Data: text };
  }
  return { mimeType: match[1] || "image/jpeg", base64Data: match[2] || "" };
};

const normalizeRisk = (value = "") => {
  const text = String(value || "").trim().toLowerCase();
  if (text === "high") return "high";
  if (text === "medium" || text === "med") return "med";
  if (text === "low") return "low";
  return "pending";
};

const isUnknownLike = (value = "") => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  return [
    "unknown",
    "nahi",
    "nahin",
    "none",
    "no",
    "na",
    "null",
    "n/a",
    "koi nahi",
    "koi nahin",
    "not detected",
  ].includes(text);
};

const localizedRisk = (risk = "") => {
  if (risk === "high") return "Zyada";
  if (risk === "med") return "Thoda";
  if (risk === "low") return "Kam";
  return "Thoda";
};

const parseJsonFromText = (rawText = "") => {
  const text = String(rawText || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const runCommandJson = (command, args, timeoutMs = 40000) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("OpenCV process timeout"));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", () => {
      clearTimeout(timer);
      const payload = parseJsonFromText(stdout);
      if (payload) {
        resolve(payload);
        return;
      }
      reject(new Error(stderr || "Failed parsing OpenCV output"));
    });
  });

const inferFromDatasetWithOpenCV = async (imageData) => {
  const { base64Data } = stripDataUrlPrefix(imageData);
  if (!base64Data) {
    throw new Error("imageData base64 is required");
  }

  const tmpPath = path.join(os.tmpdir(), `smart-agri-scan-${Date.now()}.jpg`);
  await fs.writeFile(tmpPath, Buffer.from(base64Data, "base64"));

  try {
    const scriptPath = path.resolve("scripts/pest_cv_infer.py");
    const output = await runCommandJson(PYTHON_BIN, [
      scriptPath,
      "--dataset",
      DATASET_DIR,
      "--image",
      tmpPath,
      "--size",
      "96",
      "--k",
      "3",
    ]);

    if (!output?.ok) {
      throw new Error(String(output?.error || "OpenCV inference failed"));
    }

    return output;
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
};

const buildDatasetResponse = (cvResult) => {
  const label = String(cvResult?.label || "unknown");
  const confidence = Number(cvResult?.confidence || 0);
  const isHealthy = /healthy|normal|safe/i.test(label);
  const isKnown = !/unknown|unclear|notfound/i.test(label);
  const pestDetected = isKnown && !isHealthy && confidence >= CV_MIN_CONFIDENCE;
  const risk = isHealthy ? "low" : confidence >= 80 ? "high" : confidence >= 60 ? "med" : "low";
  const simpleDisease = label.replace(/[_-]+/g, " ").trim() || "Unknown";
  const actions = isHealthy
    ? ["Crop healthy lag raha hai", "Regular monitoring continue rakho", "7 din me ek baar scan repeat karo"]
    : [
        "Affected patton ko alag karo",
        "Recommended spray ko label dose ke hisab se apply karo",
        "48 ghante baad dobara scan karo",
      ];

  const farmerResponse = [
    `🐛 Keeda: ${pestDetected ? simpleDisease : "Pakka nahi dikh raha"}`,
    `⚠️ Khatra: ${localizedRisk(risk)}`,
    `🌱 Kya hua: ${
      isHealthy
        ? "Image me crop healthy lag raha hai."
        : `Dataset match: ${simpleDisease} (${Math.round(confidence)}% confidence).`
    }`,
    `✅ Kya karo: ${actions.join(" | ")}`,
  ].join("\n");

  return {
    pestDetected,
    pestName: pestDetected ? simpleDisease : "Unknown",
    diseaseName: isHealthy ? "Healthy" : simpleDisease,
    risk,
    confidence: Number.isFinite(confidence) ? Math.round(confidence) : null,
    summary: isHealthy
      ? "Crop healthy lag raha hai based on dataset match."
      : `Dataset se ${simpleDisease} jaisa pattern mila.`,
    actions,
    farmerResponse,
    model: "opencv-dataset",
    raw: cvResult,
  };
};

const detectWithGroq = async (imageData) => {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY missing in server env");
  }

  const { mimeType, base64Data } = stripDataUrlPrefix(imageData);
  if (!base64Data) {
    throw new Error("imageData base64 is required");
  }

  const prompt = [
    "You are an agricultural assistant helping Indian farmers detect crop pests.",
    "Always respond in simple Hindi or Hinglish.",
    "Return strict JSON only with keys:",
    "pestDetected (boolean), pestName (string), diseaseName (string), risk (low|medium|high), confidence (0-100), summary (string), actions (array max 3), farmerResponse (string).",
    "If image is unclear keep risk low and give safe simple steps.",
  ].join(" ");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.groqApiKey}`,
    },
    body: JSON.stringify({
      model: env.groqVisionModel || env.groqModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          ],
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errPayload = await response.json();
      detail = errPayload?.error?.message || errPayload?.message || "";
    } catch {
      detail = "";
    }
    throw new Error(`Groq request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  const payload = await response.json();
  const rawText = String(payload?.choices?.[0]?.message?.content || "").trim();
  if (!rawText) {
    throw new Error("Groq response empty");
  }

  const parsed = parseJsonFromText(rawText) || {};
  const actions = Array.isArray(parsed.actions)
    ? parsed.actions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
    : [];
  const risk = normalizeRisk(parsed.risk);
  const confidence = Number(parsed.confidence);
  const rawPestName = String(parsed.pestName || "").trim();
  const rawDiseaseName = String(parsed.diseaseName || "").trim();
  const pestUnknown = isUnknownLike(rawPestName);
  const diseaseUnknown = isUnknownLike(rawDiseaseName);
  const noClearDetection = pestUnknown && diseaseUnknown;
  const normalizedRisk = noClearDetection ? "low" : risk;
  const normalizedActions =
    actions.length > 0
      ? actions
      : noClearDetection
        ? ["Photo clear light me close shot lo", "Patte palat kar dobara scan karo", "24 ghante baad rescan karein"]
        : ["Leaf ko close monitor karein", "Next 24h me dobara scan karein"];

  const fallbackFarmerResponse = [
    `🐛 Keeda: ${pestUnknown ? "Pakka nahi dikh raha" : rawPestName}`,
    `⚠️ Khatra: ${localizedRisk(normalizedRisk)}`,
    `🌱 Kya hua: ${String(parsed.summary || "Photo clear nahi tha, isliye exact problem pakka nahi mila.")}`,
    `✅ Kya karo: ${normalizedActions.join(" | ")}`,
  ].join("\n");

  return {
    pestDetected: noClearDetection ? false : Boolean(parsed.pestDetected),
    pestName: pestUnknown ? "Unknown" : rawPestName,
    diseaseName: diseaseUnknown ? "Unknown" : rawDiseaseName,
    risk: normalizedRisk,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : null,
    summary: String(
      parsed.summary ||
        (noClearDetection
          ? "Image se exact disease detect nahi hua. Clear photo upload karein."
          : "Image analyzed.")
    ),
    actions: normalizedActions,
    farmerResponse: String(parsed.farmerResponse || fallbackFarmerResponse),
    model: env.groqVisionModel || env.groqModel,
    raw: rawText,
  };
};

export const detectPestFromImage = async (imageData) => {
  try {
    const cvResult = await inferFromDatasetWithOpenCV(imageData);
    const datasetResponse = buildDatasetResponse(cvResult);

    const shouldFallbackToGroq =
      !datasetResponse.pestDetected && Number(datasetResponse.confidence || 0) < CV_MIN_CONFIDENCE;

    if (!shouldFallbackToGroq) {
      return datasetResponse;
    }
  } catch {
    // Ignore and try Groq fallback.
  }

  if (env.groqApiKey) {
    return detectWithGroq(imageData);
  }

  throw new Error("GROQ_API_KEY missing in server env");
};
