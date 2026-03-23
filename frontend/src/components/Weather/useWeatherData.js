/* This hook handles weather API calls and state while keeping WeatherPanel UI component small. */

import { useEffect, useMemo, useState } from "react";
import {
  buildAdvisory,
  buildKisanWeatherAdvisory,
  mapBackendDaily,
  mockFromProp,
  weatherEmojiFromCode,
} from "./weather.helpers";

const daysSince = (dateText) => {
  if (!dateText) return null;
  const date = new Date(String(dateText));
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));
};

const stageFromSowingDate = (sowingDate) => {
  const d = daysSince(sowingDate);
  if (d === null) return "vegetative";
  if (d < 20) return "sowing";
  if (d < 70) return "vegetative";
  if (d < 110) return "flowering";
  return "harvest";
};

const randomSoilMoisturePercent = () => Math.floor(Math.random() * 46) + 30;

const buildFieldAdvisoryContext = ({ fields = [], cropEntries = [], soilMoisture = 42 } = {}) => {
  const primaryCropFromEntries =
    Array.isArray(cropEntries) && cropEntries.length > 0
      ? [...cropEntries].sort((a, b) => Number(b?.acres || 0) - Number(a?.acres || 0))[0]?.name
      : "";
  const primaryCropFromFields =
    Array.isArray(fields) && fields.length > 0 ? fields[0]?.crop : "";
  const primaryEntry =
    Array.isArray(cropEntries) && cropEntries.length > 0
      ? [...cropEntries].sort((a, b) => Number(b?.acres || 0) - Number(a?.acres || 0))[0]
      : null;

  return {
    cropType: String(primaryCropFromEntries || primaryCropFromFields || "wheat").toLowerCase(),
    cropStage: "vegetative",
    soilType: String(primaryEntry?.soilType || "Loam").toLowerCase(),
    soilMoisture,
    rainTimeWindow: "3pm-7pm",
  };
};

export const useWeatherData = (weather, fieldData = {}) => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  const defaultQuery = useMemo(
    () => String(fieldData?.sharedLocation?.label || "Kendujhar"),
    [fieldData?.sharedLocation?.label]
  );
  const cropOptions = useMemo(() => {
    const fromEntries = Array.isArray(fieldData?.cropEntries)
      ? fieldData.cropEntries.map((item) => String(item?.name || "").trim()).filter(Boolean)
      : [];
    const fromFields = Array.isArray(fieldData?.fields)
      ? fieldData.fields.map((item) => String(item?.crop || "").trim()).filter(Boolean)
      : [];
    if (fromEntries.length > 0) {
      return Array.from(new Set(fromEntries));
    }
    return Array.from(new Set(fromFields));
  }, [fieldData?.cropEntries, fieldData?.fields]);

  const [selectedCrop, setSelectedCrop] = useState(() => {
    const initialContext = buildFieldAdvisoryContext({
      ...fieldData,
      soilMoisture: randomSoilMoisturePercent(),
    });
    return initialContext.cropType;
  });
  const [dummySoilMoisture, setDummySoilMoisture] = useState(() => randomSoilMoisturePercent());

  const getAdvisoryContext = () => {
    const base = buildFieldAdvisoryContext({
      ...fieldData,
      soilMoisture: dummySoilMoisture,
    });
    return {
      ...base,
      cropType: String(selectedCrop || base.cropType || "wheat").toLowerCase(),
    };
  };

  const [query, setQuery] = useState(defaultQuery);
  const [weatherData, setWeatherData] = useState(() => mockFromProp(weather, getAdvisoryContext()));
  const [cropAdvisories, setCropAdvisories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buildCropWiseAdvisories = ({ current, daily }) => {
    const entries = Array.isArray(fieldData?.cropEntries) ? fieldData.cropEntries : [];
    const fallbackCrops = Array.isArray(fieldData?.fields)
      ? fieldData.fields.map((item) => String(item?.crop || "").trim()).filter(Boolean)
      : [];
    const entryCrops = entries.map((entry) => String(entry?.name || "").trim()).filter(Boolean);
    const cropNames = entryCrops.length > 0
      ? Array.from(new Set(entryCrops))
      : Array.from(new Set(fallbackCrops));

    const sourceCrops = cropNames.length > 0 ? cropNames : [selectedCrop || "wheat"];
    return sourceCrops.map((cropName) => {
      const entry = entries.find(
        (item) => String(item?.name || "").trim().toLowerCase() === cropName.toLowerCase()
      );
      const advisory = buildKisanWeatherAdvisory({
        current,
        daily,
        context: {
          cropType: String(cropName || "wheat").toLowerCase(),
          cropStage: stageFromSowingDate(entry?.sowingDate),
          soilType: String(entry?.soilType || "Loam").toLowerCase(),
          soilMoisture: dummySoilMoisture,
          rainTimeWindow: "3pm-7pm",
        },
      });

      return {
        cropName,
        risk: String(advisory?.risk_level || "green"),
        summary: advisory?.summary_hi || advisory?.ek_line_summary || "Mausam advisory available.",
        do: Array.isArray(advisory?.today_do) ? advisory.today_do : advisory?.aaj_karo || [],
        dont: Array.isArray(advisory?.today_dont) ? advisory.today_dont : advisory?.aaj_mat_karo || [],
      };
    });
  };

  const buildWeatherState = ({ place, current, daily }) => {
    const today = daily[0];
    const tomorrow = daily[1];
    const advisoryData = buildKisanWeatherAdvisory({
      current,
      daily,
      context: getAdvisoryContext(),
    });

    return {
      place,
      currentTemp: Math.round(Number(current.tempC ?? today?.maxTemp ?? 0)),
      feelsLike: Math.round(Number(current.feelsLikeC ?? current.tempC ?? 0)),
      humidity: Math.round(Number(current.humidity ?? 0)),
      wind: `${Math.round(Number(current.windKmph ?? 0))} km/h`,
      condition: current.condition || today?.description || "Clear",
      emoji: weatherEmojiFromCode(current.iconCode || ""),
      advisory: advisoryData.ek_line_summary || buildAdvisory(today, tomorrow),
      advisoryData,
      daily,
    };
  };

  const loadByCoords = async (lat, lon, label = "") => {
    setLoading(true);
    setError("");
    setDummySoilMoisture(randomSoilMoisturePercent());

    try {
      const response = await fetch(
        `${apiBase}/weather/forecast10?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
      );

      if (!response.ok) {
        throw new Error("Backend weather API failed");
      }

      const payload = await response.json();
      const dailyRaw = Array.isArray(payload?.daily) ? payload.daily : [];
      const current = payload?.current;
      if (!current || dailyRaw.length === 0) {
        throw new Error("Weather data not found");
      }

      const daily = mapBackendDaily(dailyRaw);
      const place = label || payload.location || "Meri Location";
      setWeatherData(buildWeatherState({ place, current, daily }));
      setCropAdvisories(buildCropWiseAdvisories({ current, daily }));
      setQuery(place);
      fieldData?.onSharedLocationChange?.({
        label: place,
        lat: Number(lat),
        lon: Number(lon),
      });
    } catch {
      setWeatherData(mockFromProp(weather, getAdvisoryContext()));
      const fallbackState = mockFromProp(weather, getAdvisoryContext());
      const fallbackCurrent = {
        tempC: fallbackState.currentTemp,
        feelsLikeC: fallbackState.feelsLike,
        humidity: fallbackState.humidity,
        windKmph: Number.parseInt(String(fallbackState.wind || "0"), 10) || 0,
        condition: fallbackState.condition,
      };
      setCropAdvisories(buildCropWiseAdvisories({ current: fallbackCurrent, daily: fallbackState.daily }));
      setError("Live weather load nahi ho paya. Mock data dikhaya gaya hai.");
    } finally {
      setLoading(false);
    }
  };

  const loadByCity = async () => {
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setDummySoilMoisture(randomSoilMoisturePercent());

    try {
      const response = await fetch(
        `${apiBase}/weather/forecast10?city=${encodeURIComponent(query.trim())}`
      );

      if (!response.ok) {
        throw new Error("City lookup failed");
      }

      const payload = await response.json();
      const dailyRaw = Array.isArray(payload?.daily) ? payload.daily : [];
      const current = payload?.current;

      if (!current || dailyRaw.length === 0) {
        throw new Error("City not found");
      }

      const daily = mapBackendDaily(dailyRaw);
      const place = payload.location || query.trim();
      setWeatherData(
        buildWeatherState({
          place,
          current,
          daily,
        })
      );
      fieldData?.onSharedLocationChange?.({
        label: place,
        lat: null,
        lon: null,
      });
      setLoading(false);
    } catch {
      setLoading(false);
      setError("Location nahi mila. Sheher ka naam dobara check karein.");
    }
  };

  const loadByMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Device location support nahi karta.");
      return;
    }

    setLoading(true);
    setError("");
    setQuery("Meri Location");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        loadByCoords(latitude, longitude, "Meri Location");
      },
      () => {
        setLoading(false);
        setError("Location permission deny ho gayi. City naam dal ke try karein.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    const label = String(fieldData?.sharedLocation?.label || "").trim();
    const lat = Number(fieldData?.sharedLocation?.lat);
    const lon = Number(fieldData?.sharedLocation?.lon);

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      loadByCoords(lat, lon, label || "Meri Location");
      return;
    }

    if (label) {
      setQuery(label);
      return;
    }

    loadByMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldData?.sharedLocation?.label, fieldData?.sharedLocation?.lat, fieldData?.sharedLocation?.lon]);

  useEffect(() => {
    if (!selectedCrop) {
      return;
    }

      setWeatherData((prev) => {
        const daily = Array.isArray(prev?.daily) ? prev.daily : [];
        if (daily.length === 0) {
          return prev;
        }

      const current = {
        tempC: prev.currentTemp,
        feelsLikeC: prev.feelsLike,
        humidity: prev.humidity,
        windKmph: Number.parseInt(String(prev.wind || "0"), 10) || 0,
        condition: prev.condition,
      };

      const next = buildWeatherState({
        place: prev.place,
        current,
        daily,
      });
      setCropAdvisories(buildCropWiseAdvisories({ current, daily }));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop]);

  return {
    query,
    setQuery,
    selectedCrop,
    setSelectedCrop,
    cropOptions,
    weatherData,
    cropAdvisories,
    loading,
    error,
    loadByCity,
    loadByMyLocation,
  };
};
