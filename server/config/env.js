import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const env = {
  port: Number(process.env.PORT || 8000),
  weatherbitApiKey: process.env.WEATHERBIT_API_KEY || "",
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  groqVisionModel: process.env.GROQ_VISION_MODEL || process.env.GROQ_MODEL || "llama-3.2-90b-vision-preview",
  indianWeatherApiKey: process.env.INDIAN_WEATHER_API_KEY || "",
  indianWeatherApiBaseUrl: process.env.INDIAN_WEATHER_API_BASE_URL || "https://weather.indianapi.in",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "*",
};
