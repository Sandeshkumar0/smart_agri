import { fetchForecast10Days } from "../services/weather.service.js";
import { apiError, apiResponse } from "../utils/http.js";

export const getForecast10 = async (req, res) => {
  const { city, lat, lon } = req.query;
  if (!city && (!lat || !lon)) {
    return apiError(res, 400, "city or lat/lon is required");
  }

  try {
    const payload = await fetchForecast10Days({ city, lat, lon });
    return apiResponse(res, 200, payload);
  } catch (error) {
    const location = String(city || "Meri Location");
    return apiResponse(res, 200, {
      location,
      current: {
        tempC: 30,
        feelsLikeC: 34,
        humidity: 70,
        windKmph: 10,
        condition: "Cloudy",
        iconCode: "c03d",
      },
      daily: Array.from({ length: 10 }).map((_, idx) => ({
        date: new Date(Date.now() + idx * 86400000).toISOString().slice(0, 10),
        maxTemp: 30 + (idx % 3),
        minTemp: 22 + (idx % 2),
        rainChance: Math.max(10, 55 - idx * 4),
        iconCode: idx % 2 ? "r01d" : "c03d",
        condition: idx % 2 ? "Rain" : "Cloudy",
      })),
      _fallback: true,
      _error: error?.message || "weather service failed",
    });
  }
};
