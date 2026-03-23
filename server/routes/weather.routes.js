import { Router } from "express";
import { getForecast10 } from "../controllers/weather.controller.js";
import { withFallback } from "../utils/http.js";

const router = Router();

router.get(
  "/forecast10",
  withFallback(getForecast10, {
    fallbackFactory: (req) => {
      const city = String(req?.query?.city || "Meri Location");
      const today = new Date().toISOString().slice(0, 10);
      return {
        location: city,
        current: {
          tempC: 30,
          feelsLikeC: 34,
          humidity: 70,
          windKmph: 10,
          condition: "Cloudy",
          iconCode: "c03d",
        },
        daily: Array.from({ length: 10 }).map((_, idx) => ({
          date: new Date(Date.now() + idx * 86400000).toISOString().slice(0, 10) || today,
          maxTemp: 30 + (idx % 3),
          minTemp: 22 + (idx % 2),
          rainChance: Math.max(10, 55 - idx * 4),
          iconCode: idx % 2 ? "r01d" : "c03d",
          condition: idx % 2 ? "Rain" : "Cloudy",
        })),
      };
    },
    message: "Weather fallback used",
  })
);

export default router;
