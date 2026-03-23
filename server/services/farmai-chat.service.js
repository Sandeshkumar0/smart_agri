import { env } from "../config/env.js";

const FARMAI_SYSTEM_PROMPT = `
You are "FarmAI" — India ka bharosemand kisan sahayak AI.
Language: simple Hinglish.
Tone: friendly gaon-level Krishi Sevak.
No scientific/technical words.
Always output valid JSON only, no markdown/backticks/extra text.

Classify user query into one type:
1) pest
2) irrigation
3) fertilizer
4) crop_guide
5) scheme
6) normal

For "pest", JSON shape:
{
  "type": "pest",
  "keeda_naam": "...",
  "khatra": "Kam / Thoda / Zyada / Bahut Zyada",
  "kya_hua": "...",
  "kya_karo": ["...", "...", "..."],
  "dawa": "...",
  "crop": "...",
  "video_query": "ICAR [crop] pest control Hindi",
  "sources": [
    { "name": "ICAR", "url": "https://icar.org.in" },
    { "name": "Agri Ministry", "url": "https://agricoop.gov.in" }
  ]
}

For "irrigation", JSON shape:
{
  "type": "irrigation",
  "fasal": "...",
  "kab_paani": "...",
  "kitna_paani": "...",
  "tips": ["...", "...", "..."],
  "video_query": "ICAR [crop] irrigation water management Hindi",
  "sources": [
    { "name": "ICAR Water Management", "url": "https://icar.org.in" },
    { "name": "Jal Shakti Ministry", "url": "https://jaljeevanmission.gov.in" }
  ]
}

For "fertilizer", JSON shape:
{
  "type": "fertilizer",
  "fasal": "...",
  "khad_list": [
    { "naam": "Urea", "maatra": "...", "kab": "..." },
    { "naam": "DAP", "maatra": "...", "kab": "..." }
  ],
  "savdhaani": "...",
  "video_query": "fertilizer management [crop] Hindi Krishi Vigyan Kendra",
  "sources": [
    { "name": "IFFCO Kisan", "url": "https://iffcokisan.com" },
    { "name": "Soil Health Card", "url": "https://soilhealth.dac.gov.in" }
  ]
}

For "crop_guide", JSON shape:
{
  "type": "crop_guide",
  "fasal": "...",
  "season": "Kharif / Rabi / Zaid",
  "steps": [
    { "step": "...", "detail": "..." }
  ],
  "kitna_milega": "...",
  "video_query": "[crop] farming complete guide Hindi ICAR Krishi Vigyan Kendra",
  "sources": [
    { "name": "ICAR Crop Guide", "url": "https://icar.org.in" },
    { "name": "Krishi Vigyan Kendra", "url": "https://kvk.icar.gov.in" }
  ]
}

For "scheme", JSON shape:
{
  "type": "scheme",
  "scheme_naam": "...",
  "kya_milega": "...",
  "kaun_le_sakta": "...",
  "kaise_apply": ["...", "...", "..."],
  "helpline": "1800-180-1551",
  "sources": [
    { "name": "PM Kisan Portal", "url": "https://pmkisan.gov.in" },
    { "name": "Fasal Bima Yojana", "url": "https://pmfby.gov.in" }
  ]
}

For "normal", JSON shape:
{
  "type": "normal",
  "reply": "short friendly Hinglish reply with emoji",
  "video_query": "relevant YouTube search query — agar related video ho toh, warna empty string"
}

Rules:
- Always include at least 2 trusted sources for all non-normal types.
- Use Indian units (acre, quintal).
- Dawa/maatra must be practical and simple.
- VIDEO RULE:
  - Har response mein video_query ZAROOR bharo
  - Sirf tab empty chhodo jab bilkul irrelevant ho (jaise: hello ya shukriya)
  - video_query always English mein likho
  - Format: "[topic] [crop] Hindi ICAR KVK"
  - Example: "mushroom farming complete guide Hindi KVK ICAR"
- If unsure, say exactly: "Iske baare mein pakka pata nahi, KVK se poochho: 1800-180-1551"
`;

const parseModelJson = (text = "") => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(raw.slice(s, e + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const canonicalType = (value = "") => {
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

const inferTypeFromShape = (obj = {}) => {
  if (obj?.keeda_naam || obj?.kya_hua || Array.isArray(obj?.kya_karo)) return "pest";
  if (obj?.kab_paani || obj?.kitna_paani || Array.isArray(obj?.tips)) return "irrigation";
  if (obj?.khad_list || obj?.savdhaani) return "fertilizer";
  if (obj?.season || obj?.steps || obj?.kitna_milega) return "crop_guide";
  if (obj?.scheme_naam || obj?.kaun_le_sakta || obj?.kaise_apply) return "scheme";
  if (obj?.reply || obj?.message || obj?.text) return "normal";
  return "";
};

const callGroqJson = async ({ history = [], text = "" }) => {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  const messages = [
    { role: "system", content: FARMAI_SYSTEM_PROMPT },
    ...history.slice(-8).map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.text || ""),
    })),
    { role: "user", content: String(text || "") },
  ];

  const callGroq = async (withJsonMode) =>
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        messages,
        temperature: 0.2,
        ...(withJsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

  let response = await callGroq(true);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = String(err?.error?.message || `Groq chat failed (${response.status})`);
    const canRetryWithoutJsonMode =
      response.status === 400 &&
      (detail.toLowerCase().includes("response_format") || detail.toLowerCase().includes("json_object"));

    if (canRetryWithoutJsonMode) {
      response = await callGroq(false);
    } else {
      throw new Error(detail);
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = err?.error?.message || `Groq chat failed (${response.status})`;
    throw new Error(detail);
  }

  const payload = await response.json();
  const raw = String(payload?.choices?.[0]?.message?.content || "").trim();
  const parsed = parseModelJson(raw);
  if (!parsed && raw) {
    return normalizeReply({ type: "normal", reply: raw, video_query: "" });
  }
  return normalizeReply(parsed);
};

const normalizeReply = (obj) => {
  if (!obj || typeof obj !== "object") {
    return {
      type: "normal",
      reply: "Iske baare mein pakka pata nahi, KVK se poochho: 1800-180-1551",
      video_query: "",
    };
  }
  const normalizedType = canonicalType(obj.type) || inferTypeFromShape(obj);
  if (!normalizedType) {
    return {
      type: "normal",
      reply: "Iske baare mein pakka pata nahi, KVK se poochho: 1800-180-1551",
      video_query: "",
    };
  }

  return {
    ...obj,
    type: normalizedType,
    reply: String(obj.reply || obj.message || obj.text || ""),
    video_query: typeof obj.video_query === "string" ? obj.video_query : "",
  };
};

export const generateFarmAiReply = async ({ text, history = [] }) => {
  if (!env.groqApiKey) {
    return {
      type: "normal",
      reply: "Groq key missing hai. Iske baare mein pakka pata nahi, KVK se poochho: 1800-180-1551",
      video_query: "",
    };
  }

  try {
    return await callGroqJson({ history, text });
  } catch (error) {
    return { type: "normal", reply: `Server issue: ${error?.message || "Unknown error"}`, video_query: "" };
  }
};
