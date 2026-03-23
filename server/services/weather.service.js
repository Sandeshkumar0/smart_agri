import { randomUUID } from "node:crypto";
import { readDb, writeDb } from "../config/db.js";
import { env } from "../config/env.js";

const INDIA_LOCATION_HINTS = {
  goa: { lat: 15.2993, lon: 74.124, label: "Goa, India" },
  odisha: { lat: 20.9517, lon: 85.0985, label: "Odisha, India" },
  delhi: { lat: 28.6139, lon: 77.209, label: "Delhi, India" },
  mumbai: { lat: 19.076, lon: 72.8777, label: "Mumbai, India" },
  bengaluru: { lat: 12.9716, lon: 77.5946, label: "Bengaluru, India" },
  bangalore: { lat: 12.9716, lon: 77.5946, label: "Bengaluru, India" },
  kolkata: { lat: 22.5726, lon: 88.3639, label: "Kolkata, India" },
  chennai: { lat: 13.0827, lon: 80.2707, label: "Chennai, India" },
};

const weatherFromCode = (code = -1) => {
  const num = Number(code);
  if ([95, 96, 99].includes(num)) {
    return { condition: "Thunderstorm", iconCode: "t01d" };
  }
  if ([80, 81, 82, 61, 63, 65, 66, 67].includes(num)) {
    return { condition: "Rain", iconCode: "r01d" };
  }
  if ([51, 53, 55, 56, 57].includes(num)) {
    return { condition: "Drizzle", iconCode: "d01d" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(num)) {
    return { condition: "Snow", iconCode: "s01d" };
  }
  if ([45, 48].includes(num)) {
    return { condition: "Fog", iconCode: "a01d" };
  }
  if (num === 0) {
    return { condition: "Clear", iconCode: "c01d" };
  }
  if ([1, 2, 3].includes(num)) {
    return { condition: "Cloudy", iconCode: "c03d" };
  }

  return { condition: "Partly cloudy", iconCode: "c02d" };
};

const weatherFromConditionText = (value = "") => {
  const text = String(value || "").toLowerCase();
  if (text.includes("thunder")) return { condition: "Thunderstorm", iconCode: "t01d" };
  if (text.includes("rain") || text.includes("shower")) return { condition: "Rain", iconCode: "r01d" };
  if (text.includes("drizzle")) return { condition: "Drizzle", iconCode: "d01d" };
  if (text.includes("snow") || text.includes("sleet")) return { condition: "Snow", iconCode: "s01d" };
  if (text.includes("mist") || text.includes("fog") || text.includes("haze")) return { condition: "Fog", iconCode: "a01d" };
  if (text.includes("cloud")) return { condition: "Cloudy", iconCode: "c03d" };
  if (text.includes("clear") || text.includes("sun")) return { condition: "Clear", iconCode: "c01d" };
  return { condition: "Partly cloudy", iconCode: "c02d" };
};

const toIsoDate = (value = "") => {
  const text = String(value || "").trim();
  if (!text) {
    return new Date().toISOString().slice(0, 10);
  }

  const maybeDate = new Date(text);
  if (!Number.isNaN(maybeDate.getTime())) {
    return maybeDate.toISOString().slice(0, 10);
  }

  const match = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) {
    return new Date().toISOString().slice(0, 10);
  }

  const monthMap = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const day = Number(match[1]);
  const month = monthMap[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
};

const logPayload = async ({ city, lat, lon, payload, provider }) => {
  const db = await readDb();
  db.weatherLogs.push({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    provider,
    request: { city, lat, lon },
    payload,
  });
  if (db.weatherLogs.length > 50) {
    db.weatherLogs = db.weatherLogs.slice(-50);
  }
  await writeDb(db);
};

const fetchForecastFromWeatherbit = async ({ city, lat, lon }) => {
  if (!env.weatherbitApiKey) {
    throw new Error("WEATHERBIT_API_KEY missing");
  }

  let currentUrl = "";
  if (city) {
    currentUrl = `https://api.weatherbit.io/v2.0/current?city=${encodeURIComponent(city)}&key=${env.weatherbitApiKey}`;
  } else {
    currentUrl = `https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=${env.weatherbitApiKey}`;
  }

  const currentRes = await fetch(currentUrl);
  if (!currentRes.ok) {
    throw new Error("Current weather fetch failed");
  }

  const currentJson = await currentRes.json();
  const current = currentJson?.data?.[0];
  if (!current) {
    throw new Error("Location not found");
  }

  const dailyUrl = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${current.lat}&lon=${current.lon}&days=10&key=${env.weatherbitApiKey}`;
  const dailyRes = await fetch(dailyUrl);
  if (!dailyRes.ok) {
    throw new Error("Forecast fetch failed");
  }

  const dailyJson = await dailyRes.json();
  const daily = Array.isArray(dailyJson?.data) ? dailyJson.data.slice(0, 10) : [];

  const payload = {
    location: `${current.city_name}, ${current.country_code}`,
    current: {
      tempC: Math.round(Number(current.temp ?? 0)),
      feelsLikeC: Math.round(Number(current.app_temp ?? 0)),
      humidity: Math.round(Number(current.rh ?? 0)),
      windKmph: Math.round(Number(current.wind_spd ?? 0) * 3.6),
      condition: current.weather?.description || "Clear",
      iconCode: current.weather?.icon || "",
    },
    daily: daily.map((item) => ({
      date: item.valid_date,
      maxTemp: Math.round(Number(item.max_temp ?? 0)),
      minTemp: Math.round(Number(item.min_temp ?? 0)),
      rainChance: Math.round(Number(item.pop ?? 0)),
      iconCode: item.weather?.icon || "",
      condition: item.weather?.description || "Clear",
    })),
  };

  return payload;
};

const fetchForecastFromIndianApi = async ({ city, lat, lon }) => {
  if (!env.indianWeatherApiKey) {
    throw new Error("INDIAN_WEATHER_API_KEY missing");
  }

  const normalizedCity = String(city || "").trim();
  const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
  if (!normalizedCity && !hasCoords) {
    throw new Error("city or lat/lon required");
  }

  const baseUrl = String(env.indianWeatherApiBaseUrl || "https://weather.indianapi.in").replace(/\/+$/, "");
  const headers = {
    "x-api-key": env.indianWeatherApiKey,
  };

  const globalLocation = normalizedCity || `${lat},${lon}`;
  let response = null;
  let data = null;
  let usingIndiaEndpoint = false;

  if (normalizedCity) {
    const indiaUrl = `${baseUrl}/india/weather?city=${encodeURIComponent(normalizedCity)}`;
    response = await fetch(indiaUrl, { headers });
    if (response.ok) {
      data = await response.json();
      usingIndiaEndpoint = true;
    }
  }

  if (!data) {
    const globalUrl = `${baseUrl}/global/weather?location=${encodeURIComponent(globalLocation)}&days=3`;
    response = await fetch(globalUrl, { headers });
    if (!response.ok) {
      throw new Error(`Indian weather API failed (${response.status})`);
    }
    data = await response.json();
  }

  if (!data) {
    throw new Error("Indian weather API data invalid");
  }

  if (usingIndiaEndpoint) {
    const current = data?.weather?.current || {};
    const forecast = Array.isArray(data?.weather?.forecast) ? data.weather.forecast : [];
    if (forecast.length === 0) {
      throw new Error("Indian weather API India forecast missing");
    }

    const humidityMorning = Number(current?.humidity?.morning ?? 0);
    const humidityEvening = Number(current?.humidity?.evening ?? humidityMorning);
    const humidityAvg = Math.round((humidityMorning + humidityEvening) / 2);
    const currentMax = Number(current?.temperature?.max?.value ?? forecast[0]?.max_temp ?? 0);
    const currentMin = Number(current?.temperature?.min?.value ?? forecast[0]?.min_temp ?? 0);
    const currentTemp = Math.round((currentMax + currentMin) / 2);

    const firstCondition = String(forecast[0]?.description || "Cloudy");
    const currentLabel = weatherFromConditionText(firstCondition);

    return {
      location: data?.city || normalizedCity || "India",
      current: {
        tempC: currentTemp,
        feelsLikeC: currentTemp,
        humidity: Number.isFinite(humidityAvg) ? humidityAvg : 0,
        windKmph: 0,
        condition: firstCondition,
        iconCode: currentLabel.iconCode,
      },
      daily: forecast.map((item) => {
        const conditionText = String(item?.description || "Cloudy");
        const label = weatherFromConditionText(conditionText);
        return {
          date: toIsoDate(item?.date),
          maxTemp: Math.round(Number(item?.max_temp ?? currentTemp)),
          minTemp: Math.round(Number(item?.min_temp ?? currentTemp)),
          rainChance: conditionText.toLowerCase().includes("rain") ? 70 : 20,
          iconCode: label.iconCode,
          condition: conditionText,
        };
      }),
    };
  }

  const current = data?.current || {};
  const forecast = Array.isArray(data?.forecast) ? data.forecast : [];
  if (forecast.length === 0) {
    throw new Error("Indian weather API global forecast missing");
  }

  const currentLabel = weatherFromConditionText(current?.condition);
  return {
    location: data?.location || globalLocation,
    current: {
      tempC: Math.round(Number(current?.temperature ?? forecast[0]?.max_temp ?? 0)),
      feelsLikeC: Math.round(Number(current?.feels_like ?? current?.temperature ?? 0)),
      humidity: Math.round(Number(current?.humidity ?? 0)),
      windKmph: Math.round(Number(current?.wind_speed ?? 0) * 3.6),
      condition: current?.condition || currentLabel.condition,
      iconCode: currentLabel.iconCode,
    },
    daily: forecast.map((item) => {
      const conditionText = String(item?.hourly?.[0]?.condition || "Cloudy");
      const label = weatherFromConditionText(conditionText);
      const rainChance = Number(item?.hourly?.[0]?.chance_of_rain ?? 0);
      return {
        date: toIsoDate(item?.date),
        maxTemp: Math.round(Number(item?.max_temp ?? 0)),
        minTemp: Math.round(Number(item?.min_temp ?? 0)),
        rainChance: Math.round(Number.isFinite(rainChance) ? rainChance : 0),
        iconCode: label.iconCode,
        condition: conditionText,
      };
    }),
  };
};

const fetchForecastFromOpenWeather = async ({ city, lat, lon }) => {
  if (!env.openWeatherApiKey) {
    throw new Error("OPENWEATHER_API_KEY missing");
  }

  let targetLat = Number(lat);
  let targetLon = Number(lon);
  let locationLabel = "Meri Location";

  if (city) {
    const normalizedCity = String(city).trim();
    if (!normalizedCity) {
      throw new Error("city required");
    }

    const indiaGeoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      `${normalizedCity},IN`
    )}&limit=1&appid=${encodeURIComponent(env.openWeatherApiKey)}`;
    const globalGeoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      normalizedCity
    )}&limit=1&appid=${encodeURIComponent(env.openWeatherApiKey)}`;

    let geoRes = await fetch(indiaGeoUrl);
    let geoJson = geoRes.ok ? await geoRes.json() : [];
    let geoHit = Array.isArray(geoJson) ? geoJson[0] : null;

    if (!geoHit) {
      geoRes = await fetch(globalGeoUrl);
      geoJson = geoRes.ok ? await geoRes.json() : [];
      geoHit = Array.isArray(geoJson) ? geoJson[0] : null;
    }

    if (!geoHit) {
      throw new Error("OpenWeather city not found");
    }

    targetLat = Number(geoHit.lat);
    targetLon = Number(geoHit.lon);
    locationLabel = [geoHit.name, geoHit.state, geoHit.country].filter(Boolean).join(", ");
  } else {
    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLon)) {
      throw new Error("Valid lat/lon required");
    }

    try {
      const reverseUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${encodeURIComponent(
        targetLat
      )}&lon=${encodeURIComponent(targetLon)}&limit=1&appid=${encodeURIComponent(env.openWeatherApiKey)}`;
      const reverseRes = await fetch(reverseUrl);
      if (reverseRes.ok) {
        const reverseJson = await reverseRes.json();
        const hit = Array.isArray(reverseJson) ? reverseJson[0] : null;
        if (hit) {
          locationLabel = [hit.name, hit.state, hit.country].filter(Boolean).join(", ");
        }
      }
    } catch {
      locationLabel = "Meri Location";
    }
  }

  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(
    targetLat
  )}&lon=${encodeURIComponent(targetLon)}&units=metric&appid=${encodeURIComponent(env.openWeatherApiKey)}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(
    targetLat
  )}&lon=${encodeURIComponent(targetLon)}&units=metric&appid=${encodeURIComponent(env.openWeatherApiKey)}`;

  const currentRes = await fetch(currentUrl);
  if (!currentRes.ok) {
    throw new Error(`OpenWeather current failed (${currentRes.status})`);
  }
  const currentJson = await currentRes.json();

  const forecastRes = await fetch(forecastUrl);
  if (!forecastRes.ok) {
    throw new Error(`OpenWeather forecast failed (${forecastRes.status})`);
  }
  const forecastJson = await forecastRes.json();
  const rows = Array.isArray(forecastJson?.list) ? forecastJson.list : [];
  if (rows.length === 0) {
    throw new Error("OpenWeather forecast missing");
  }

  const grouped = new Map();
  rows.forEach((item) => {
    const dateKey = String(item?.dt_txt || "").slice(0, 10) || new Date(Number(item?.dt || 0) * 1000).toISOString().slice(0, 10);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey).push(item);
  });

  const daily = [...grouped.entries()]
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(0, 10)
    .map(([date, items]) => {
      const maxTemp = Math.round(Math.max(...items.map((x) => Number(x?.main?.temp_max ?? x?.main?.temp ?? 0))));
      const minTemp = Math.round(Math.min(...items.map((x) => Number(x?.main?.temp_min ?? x?.main?.temp ?? 0))));
      const rainChance = Math.round(
        Math.max(...items.map((x) => Number.isFinite(Number(x?.pop)) ? Number(x.pop) * 100 : 0))
      );
      const best = items.reduce((acc, curr) => {
        const accPop = Number(acc?.pop ?? 0);
        const currPop = Number(curr?.pop ?? 0);
        return currPop > accPop ? curr : acc;
      }, items[0]);
      const condition = String(best?.weather?.[0]?.description || "Clear");
      const mapped = weatherFromConditionText(condition);

      return {
        date,
        maxTemp,
        minTemp,
        rainChance,
        iconCode: mapped.iconCode,
        condition: mapped.condition,
      };
    });

  const currentCondition = String(currentJson?.weather?.[0]?.description || daily[0]?.condition || "Clear");
  const currentMapped = weatherFromConditionText(currentCondition);
  return {
    location: locationLabel || `${currentJson?.name || ""}, ${currentJson?.sys?.country || ""}`.replace(/^,\s*/, ""),
    current: {
      tempC: Math.round(Number(currentJson?.main?.temp ?? daily[0]?.maxTemp ?? 0)),
      feelsLikeC: Math.round(Number(currentJson?.main?.feels_like ?? currentJson?.main?.temp ?? 0)),
      humidity: Math.round(Number(currentJson?.main?.humidity ?? 0)),
      windKmph: Math.round(Number(currentJson?.wind?.speed ?? 0) * 3.6),
      condition: currentMapped.condition,
      iconCode: currentMapped.iconCode,
    },
    daily,
  };
};

const fetchForecastFromOpenMeteo = async ({ city, lat, lon }) => {
  let targetLat = Number(lat);
  let targetLon = Number(lon);
  let locationLabel = "Meri Location";

  if (city) {
    const normalizedCity = String(city).trim().toLowerCase();
    const hint = INDIA_LOCATION_HINTS[normalizedCity];
    if (hint) {
      targetLat = hint.lat;
      targetLon = hint.lon;
      locationLabel = hint.label;
    }

    const indiaGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json&countryCode=IN`;
    const globalGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json`;

    let result = null;
    const indiaGeoRes = await fetch(indiaGeoUrl);
    if (indiaGeoRes.ok) {
      const indiaGeoJson = await indiaGeoRes.json();
      result = Array.isArray(indiaGeoJson?.results) ? indiaGeoJson.results[0] : null;
    }

    if (!result && !hint) {
      const globalGeoRes = await fetch(globalGeoUrl);
      if (!globalGeoRes.ok) {
        throw new Error("Open-Meteo geocoding failed");
      }
      const globalGeoJson = await globalGeoRes.json();
      result = Array.isArray(globalGeoJson?.results) ? globalGeoJson.results[0] : null;
    }

    if (!result && !hint) {
      throw new Error("City not found");
    }
    if (result) {
      targetLat = Number(result.latitude);
      targetLon = Number(result.longitude);
      locationLabel = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
    }
  } else {
    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLon)) {
      throw new Error("Valid lat/lon required");
    }
    try {
      const reverseUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(
        targetLat
      )}&longitude=${encodeURIComponent(targetLon)}&language=en&format=json`;
      const reverseRes = await fetch(reverseUrl);
      if (reverseRes.ok) {
        const reverseJson = await reverseRes.json();
        const hit = Array.isArray(reverseJson?.results) ? reverseJson.results[0] : null;
        if (hit) {
          locationLabel = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
        }
      }
    } catch {
      locationLabel = "Meri Location";
    }
  }

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
    targetLat
  )}&longitude=${encodeURIComponent(
    targetLon
  )}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=10&timezone=auto`;
  const forecastRes = await fetch(forecastUrl);
  if (!forecastRes.ok) {
    throw new Error("Open-Meteo forecast failed");
  }

  const json = await forecastRes.json();
  const current = json?.current;
  const daily = json?.daily;
  if (!current || !daily) {
    throw new Error("Open-Meteo weather data invalid");
  }

  const dates = Array.isArray(daily.time) ? daily.time : [];
  const maxTemps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
  const minTemps = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
  const rainChances = Array.isArray(daily.precipitation_probability_max)
    ? daily.precipitation_probability_max
    : [];
  const weatherCodes = Array.isArray(daily.weather_code) ? daily.weather_code : [];

  const dailyRows = dates.slice(0, 10).map((date, idx) => {
    const weather = weatherFromCode(weatherCodes[idx]);
    return {
      date,
      maxTemp: Math.round(Number(maxTemps[idx] ?? 0)),
      minTemp: Math.round(Number(minTemps[idx] ?? 0)),
      rainChance: Math.round(Number(rainChances[idx] ?? 0)),
      iconCode: weather.iconCode,
      condition: weather.condition,
    };
  });

  const currentWeather = weatherFromCode(current.weather_code);
  return {
    location: locationLabel,
    current: {
      tempC: Math.round(Number(current.temperature_2m ?? dailyRows[0]?.maxTemp ?? 0)),
      feelsLikeC: Math.round(Number(current.apparent_temperature ?? current.temperature_2m ?? 0)),
      humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
      windKmph: Math.round(Number(current.wind_speed_10m ?? 0)),
      condition: currentWeather.condition,
      iconCode: currentWeather.iconCode,
    },
    daily: dailyRows,
  };
};

export const fetchForecast10Days = async ({ city, lat, lon }) => {
  const failures = [];

  if (env.openWeatherApiKey) {
    try {
      const payload = await fetchForecastFromOpenWeather({ city, lat, lon });
      await logPayload({ city, lat, lon, payload, provider: "openweather" });
      return payload;
    } catch (error) {
      failures.push(`openweather: ${error.message}`);
    }
  }

  if (env.indianWeatherApiKey) {
    try {
      const payload = await fetchForecastFromIndianApi({ city, lat, lon });
      await logPayload({ city, lat, lon, payload, provider: "indian-weather-api" });
      return payload;
    } catch (error) {
      failures.push(`indian-weather-api: ${error.message}`);
    }
  }

  if (env.weatherbitApiKey) {
    try {
      const payload = await fetchForecastFromWeatherbit({ city, lat, lon });
      await logPayload({ city, lat, lon, payload, provider: "weatherbit" });
      return payload;
    } catch (error) {
      failures.push(`weatherbit: ${error.message}`);
    }
  }

  try {
    const payload = await fetchForecastFromOpenMeteo({ city, lat, lon });
    await logPayload({ city, lat, lon, payload, provider: "open-meteo" });
    return payload;
  } catch (error) {
    failures.push(`open-meteo: ${error.message}`);
  }

  throw new Error(failures.join(" | ") || "weather service failed");
};
