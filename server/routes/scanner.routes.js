import { Router } from "express";
import { addScan, detectPest, getScans } from "../controllers/scanner.controller.js";
import { withFallback } from "../utils/http.js";

const router = Router();

router.get("/scans", withFallback(getScans, { fallbackData: { items: [] }, message: "Scans fallback used" }));
router.post(
  "/scans",
  withFallback(addScan, {
    status: 201,
    fallbackFactory: (req) => ({
      id: `fallback-scan-${Date.now()}`,
      farmerId: String(req?.body?.farmerId || "fallback-farmer"),
      fieldId: req?.body?.fieldId || null,
      imageData: String(req?.body?.imageData || ""),
      note: String(req?.body?.note || ""),
      createdAt: new Date().toISOString(),
    }),
    message: "Scan save fallback used",
  })
);
router.post(
  "/pest-detect",
  withFallback(detectPest, {
    fallbackData: {
      pestDetected: false,
      pestName: "Pakka nahi dikh raha",
      diseaseName: "Unknown",
      risk: "low",
      confidence: null,
      summary: "Image clear nahi tha ya service busy hai.",
      actions: ["Photo clear light me lo", "Patte ulat kar check karo", "KVK se salah lo: 1800-180-1551"],
      farmerResponse:
        "🐛 Keeda: Pakka nahi dikh raha\n⚠️ Khatra: Kam\n🌱 Kya hua: Photo clear nahi tha ya service busy hai.\n✅ Kya karo: Photo clear light me lo | Patte ulat kar check karo | KVK se salah lo: 1800-180-1551",
      model: "fallback",
    },
    message: "Pest detection fallback used",
  })
);

export default router;
