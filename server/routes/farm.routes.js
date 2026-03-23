import { Router } from "express";
import { addCrop, addField, getCrops, getFields } from "../controllers/farm.controller.js";
import { withFallback } from "../utils/http.js";

const router = Router();

router.get("/crops", withFallback(getCrops, { fallbackData: { items: [] }, message: "Crops service unavailable" }));
router.post(
  "/crops",
  withFallback(addCrop, {
    status: 201,
    fallbackFactory: (req) => ({
      id: `fallback-crop-${Date.now()}`,
      name: String(req?.body?.name || "Unknown Crop"),
      season: String(req?.body?.season || "").toLowerCase(),
      createdAt: new Date().toISOString(),
    }),
    message: "Crop add fallback",
  })
);
router.get("/fields", withFallback(getFields, { fallbackData: { items: [] }, message: "Fields service unavailable" }));
router.post(
  "/fields",
  withFallback(addField, {
    status: 201,
    fallbackFactory: (req) => ({
      id: `fallback-field-${Date.now()}`,
      farmerId: String(req?.body?.farmerId || "fallback-farmer"),
      name: String(req?.body?.name || "Fallback Field"),
      areaAcre: Number(req?.body?.areaAcre || 0),
      createdAt: new Date().toISOString(),
    }),
    message: "Field add fallback",
  })
);

export default router;
