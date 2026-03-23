/* Pure helpers for weather labels, mapping and advisory engine output. */

export const weatherEmojiFromCode = (code = "") => {
  const prefix = String(code || "").slice(0, 1);
  if (prefix === "t") return "Storm";
  if (prefix === "r" || prefix === "d") return "Rain";
  if (prefix === "s") return "Snow";
  if (prefix === "a") return "Fog";
  if (prefix === "c") {
    if (code.startsWith("c01")) return "Sunny";
    if (code.startsWith("c02") || code.startsWith("c03")) return "Partly Cloudy";
    return "Cloudy";
  }
  return "Weather";
};

export const safeWeatherLabel = (value, condition = "") => {
  const label = String(value || "").trim();
  if (label && !/\?/.test(label)) return label;

  const text = String(condition || "").toLowerCase();
  if (text.includes("thunder")) return "Storm";
  if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) return "Rain";
  if (text.includes("cloud")) return "Cloudy";
  if (text.includes("mist") || text.includes("fog") || text.includes("haze")) return "Fog";
  if (text.includes("clear") || text.includes("sun")) return "Sunny";
  return "Weather";
};

export const buildAdvisory = (today, tomorrow) => {
  const rainChance = Number(tomorrow?.rainChance ?? today?.rainChance ?? 0);
  const maxTemp = Number(today?.maxTemp ?? 0);

  if (rainChance >= 70) return "Kal tez baarish chance. Spray 24-48 ghante rok do.";
  if (rainChance >= 40) return "Halka rain chance hai. Khad/spray subah jaldi plan karo.";
  if (maxTemp >= 36) return "Aaj garmi zyada hai. Dopahar me sinchai avoid karo, subah-shaam paani do.";
  return "Mausam theek lag raha hai. Normal field monitoring continue rakho.";
};

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const iconFromCondition = (text = "") => {
  const value = String(text || "").toLowerCase();
  if (value.includes("thunder") || value.includes("storm")) return "🌩️";
  if (value.includes("rain") || value.includes("drizzle") || value.includes("shower")) return "🌧️";
  if (value.includes("cloud")) return "⛅";
  return "☀️";
};

const dayLabelHindi = (index) => {
  if (index === 0) return "Kal";
  if (index === 1) return "Parso";
  return "Agle Din";
};

const estimateRainMm = (rainChance) => {
  const chance = toNum(rainChance, 0);
  if (chance >= 80) return 24;
  if (chance >= 60) return 14;
  if (chance >= 40) return 8;
  if (chance >= 20) return 3;
  return 0;
};

export const buildAgronomyRuleTableMarkdown = () =>
  [
    "| Task | Condition (Threshold) | Decision | Kyu (Simple Hindi) | Risk |",
    "|---|---|---|---|---|",
    "| Spray | Hawa >= 18 km/h OR Barish chance >= 55% OR Aane wali barish >= 8 mm | Don't | Tez hawa/barish se dawa beh jaati hai aur asar kam hota hai. | Red |",
    "| Spray | Hawa 12-18 km/h OR Barish chance 35-54% | Caution | Halka risk hai, sirf subah jaldi karein aur patte geele na hon. | Yellow |",
    "| Spray | Hawa <= 12 km/h AND Barish chance < 35% AND Aane wali barish < 8 mm | Do | Mausam spray ke liye theek hai, dawa chipakne ka chance achha hai. | Green |",
    "| Irrigation | Mitti nami >= 65% OR Barish chance >= 60% OR Aane wali barish >= 10 mm | Don't | Mitti already geeli hai, extra paani se jad kamzor ho sakti hai. | Red |",
    "| Irrigation | Mitti nami 40-64% AND Barish chance < 60% | Caution (Short) | Kam paani do, zyada paani dene ki zarurat nahi. | Yellow |",
    "| Irrigation | Mitti nami < 40% AND Barish chance < 40% | Do (Medium/Long) | Mitti sukh rahi hai, paani dena faydemand rahega. | Green |",
    "| Sowing | Aane wali barish >= 20 mm OR Barish chance >= 70% | Don't | Tez barish me beej beh sakta hai aur ankur kam nikalta hai. | Red |",
    "| Sowing | Barish chance 40-69% OR Mitti nami > 75% | Caution | 1 din rukkar dobara check karna surakshit rahega. | Yellow |",
    "| Sowing | Barish chance 20-60% AND Aane wali barish 3-15 mm AND Mitti nami 25-60% | Do | Halki nami wali mitti beej jamne ke liye acchi hoti hai. | Green |",
    "| Harvest | Barish chance >= 40% OR Nami >= 80% OR Aane wali barish >= 5 mm | Don't | Geeli fasal katne se quality girti hai aur storage me nuksan hota hai. | Red |",
    "| Harvest | Barish chance 25-39% | Caution | Sirf pakki fasal ka chhota hissa kaato, baaki rok do. | Yellow |",
    "| Harvest | Barish chance < 25% AND Nami < 80% | Do | Katayi ke liye mausam safe hai. | Green |",
  ].join("\n");

const decideSpray = ({ windSpeed, rainProbability, expectedRainMm, rainWindow }) => {
  if (windSpeed >= 18 || rainProbability >= 55 || expectedRainMm >= 8) {
    return {
      decision: "Don't",
      risk: "red",
      reason: `Aaj spray mat karo. Hawa/barish ka risk hai (${rainWindow}).`,
      window: "Rukkar kal subah check karein",
      confidence: "high",
    };
  }
  if (windSpeed > 12 || rainProbability >= 35) {
    return {
      decision: "Caution",
      risk: "yellow",
      reason: "Spray sirf subah jaldi kam matra me karo, warna ruk jao.",
      window: "7-9 AM",
      confidence: "medium",
    };
  }
  return {
    decision: "Do",
    risk: "green",
    reason: "Spray ke liye mausam theek hai, dawa tikne ka chance achha hai.",
    window: "7-10 AM / 4-6 PM",
    confidence: "high",
  };
};

const irrigationDuration = ({ soilMoisture, soilType }) => {
  if (soilMoisture < 25) return soilType === "sandy" ? "long" : "medium";
  if (soilMoisture < 40) return "medium";
  return "short";
};

const decideIrrigation = ({ soilMoisture, rainProbability, expectedRainMm, soilType }) => {
  if (soilMoisture >= 65 || rainProbability >= 60 || expectedRainMm >= 10) {
    return {
      decision: "Don't",
      risk: "red",
      reason: "Aaj sinchai mat karo, mitti me paani kaafi hai ya barish aane wali hai.",
      duration: "none",
      window: "Rukkar barish ke baad check karein",
      confidence: "high",
    };
  }
  if (soilMoisture >= 40) {
    return {
      decision: "Caution",
      risk: "yellow",
      reason: "Kam paani do, zyada dene ki zarurat nahi hai.",
      duration: "short",
      window: "6-8 AM",
      confidence: "medium",
    };
  }
  return {
    decision: "Do",
    risk: "green",
    reason: "Mitti sukh rahi hai, aaj sinchai faydemand rahegi.",
    duration: irrigationDuration({ soilMoisture, soilType }),
    window: "6-9 AM / 5-7 PM",
    confidence: "high",
  };
};

const decideSowing = ({ cropStage, soilMoisture, rainProbability, expectedRainMm }) => {
  if (cropStage !== "sowing") {
    return {
      decision: "Caution",
      risk: "yellow",
      reason: "Abhi bowaai ka stage nahi hai, planning mode rakho.",
      confidence: "medium",
    };
  }
  if (expectedRainMm >= 20 || rainProbability >= 70) {
    return {
      decision: "Don't",
      risk: "red",
      reason: "Abhi bowaai mat karo, tez barish se beej beh sakta hai.",
      confidence: "high",
    };
  }
  if (rainProbability >= 40 || soilMoisture > 75) {
    return {
      decision: "Caution",
      risk: "yellow",
      reason: "1 din rukkar mitti dubara check karo.",
      confidence: "medium",
    };
  }
  if (rainProbability >= 20 && rainProbability <= 60 && expectedRainMm >= 3 && expectedRainMm <= 15 && soilMoisture >= 25 && soilMoisture <= 60) {
    return {
      decision: "Do",
      risk: "green",
      reason: "Mitti aur barish dono bowaai ke liye sahi range me hain.",
      confidence: "high",
    };
  }
  return {
    decision: "Caution",
    risk: "yellow",
    reason: "Data clear nahi, jaldi me bowaai mat karo.",
    confidence: "low",
  };
};

const decideHarvest = ({ cropStage, rainProbability, humidity, expectedRainMm, windSpeed }) => {
  if (cropStage !== "harvest") {
    return {
      decision: "Caution",
      risk: "yellow",
      reason: "Abhi harvest stage nahi hai.",
      confidence: "medium",
    };
  }
  if (rainProbability >= 40 || humidity >= 80 || expectedRainMm >= 5) {
    return {
      decision: "Don't",
      risk: "red",
      reason: "Aaj katayi mat karo, geeli fasal se quality girti hai.",
      confidence: "high",
    };
  }
  if (rainProbability >= 25 || windSpeed >= 18) {
    return {
      decision: "Caution",
      risk: "yellow",
      reason: "Katayi ka chhota hissa karo, baaki kal rakho.",
      confidence: "medium",
    };
  }
  return {
    decision: "Do",
    risk: "green",
    reason: "Aaj katayi ke liye mausam safe hai.",
    confidence: "high",
  };
};

const maxRisk = (risks = []) => {
  if (risks.includes("red")) return "red";
  if (risks.includes("yellow")) return "yellow";
  return "green";
};

const summaryByRisk = (riskLevel, cropType) => {
  if (riskLevel === "red") {
    return `${cropType} me aaj nuksan ka chance zyada hai. Badi activity (spray/sowing/harvest) rok kar sirf bachav wale kaam karo.`;
  }
  if (riskLevel === "yellow") {
    return `${cropType} ke liye aaj milajula mausam hai. Kaam karo, lekin jaldi-baazi mat karo aur time dekhkar decision lo.`;
  }
  return `${cropType} ke liye aaj mausam stable hai. Regular khet ka kaam schedule ke hisab se kar sakte ho.`;
};

export const buildKisanWeatherAdvisory = ({ current = {}, daily = [], context = {} } = {}) => {
  const today = daily[0] || {};
  const temp = toNum(current.tempC, toNum(today.maxTemp, 30));
  const humidity = toNum(current.humidity, 55);
  const windSpeed = toNum(current.windKmph, 10);
  const rainProbability = toNum(today.rainChance, 20);
  const expectedRainMm = toNum(context.expectedRainMm, estimateRainMm(rainProbability));
  const rainWindow = String(context.rainTimeWindow || "3pm-7pm");
  const cropType = String(context.cropType || "wheat");
  const cropStage = String(context.cropStage || "vegetative");
  const soilType = String(context.soilType || "loam");
  const soilMoisture = toNum(context.soilMoisture, 42);

  const spray = decideSpray({ windSpeed, rainProbability, expectedRainMm, rainWindow });
  const irrigation = decideIrrigation({ soilMoisture, rainProbability, expectedRainMm, soilType });
  const sowing = decideSowing({ cropStage, soilMoisture, rainProbability, expectedRainMm });
  const harvest = decideHarvest({ cropStage, rainProbability, humidity, expectedRainMm, windSpeed });

  const riskLevel = maxRisk([spray.risk, irrigation.risk, sowing.risk, harvest.risk]);
  const fungalRisk = humidity >= 85 && temp >= 24 && temp <= 34;

  const todayDo = [];
  const todayDont = [];
  if (spray.decision === "Do") todayDo.push(`Spray karo (${spray.window})`);
  if (irrigation.decision === "Do") todayDo.push(`Sinchai karo (${irrigation.duration})`);
  if (sowing.decision === "Do") todayDo.push("Bowaai shuru kar sakte ho.");
  if (harvest.decision === "Do") todayDo.push("Harvest aaj kar sakte ho.");
  if (spray.decision === "Don't") todayDont.push("Aaj spray mat karo.");
  if (irrigation.decision === "Don't") todayDont.push("Aaj sinchai mat karo.");
  if (sowing.decision === "Don't") todayDont.push("Aaj bowaai mat karo.");
  if (harvest.decision === "Don't") todayDont.push("Aaj harvest mat karo.");

  const whyHi = [
    `Mitti ki nami ${soilMoisture}% aur barish chance ${rainProbability}% dekhkar salah di gayi hai.`,
    `Hawa ${windSpeed} km/h aur aane wali barish ${expectedRainMm} mm (${rainWindow}) ko dhyan me rakha gaya hai.`,
  ];
  if (fungalRisk) {
    whyHi.push("Nami aur garmi saath hai, patton par daag/galan ka risk badh sakta hai.");
  }

  const alerts = [];
  if (spray.risk === "red") alerts.push({ level: "red", title: "Spray Risk", action: spray.reason });
  if (irrigation.risk === "red") alerts.push({ level: "red", title: "Sinchai Risk", action: irrigation.reason });
  if (sowing.risk === "red") alerts.push({ level: "red", title: "Bowaai Risk", action: sowing.reason });
  if (alerts.length === 0 && riskLevel === "yellow") {
    alerts.push({ level: "yellow", title: "Dhyan Se Kaam", action: "4 ghante baad data re-check karke final faisla lo." });
  }

  const next3 = daily.slice(1, 4).map((item, idx) => {
    const dayRain = toNum(item.rainChance, 0);
    const dayMm = estimateRainMm(dayRain);
    return {
      din: dayLabelHindi(idx),
      icon: iconFromCondition(item.description),
      temp: `${toNum(item.maxTemp, temp)}C/${toNum(item.minTemp, temp - 5)}C`,
      khaas_baat:
        dayRain >= 60
          ? "Barish ka chance zyada, spray rok kar rakho."
          : dayMm >= 8
          ? "Halka se madhyam barish chance, kaam subah niptao."
          : "Normal din hai",
    };
  });

  while (next3.length < 3) {
    next3.push({
      din: dayLabelHindi(next3.length),
      icon: "⛅",
      temp: `${temp}C/${Math.max(15, temp - 6)}C`,
      khaas_baat: "Normal din hai",
    });
  }

  const jsonOutput = {
    risk_level: riskLevel,
    summary_hi: summaryByRisk(riskLevel, cropType),
    today_do: todayDo.slice(0, 3),
    today_dont: todayDont.slice(0, 3),
    time_windows: [
      { task: "spray", window: spray.window, confidence: spray.confidence },
      { task: "irrigation", window: irrigation.window, confidence: irrigation.confidence },
    ],
    why_hi: whyHi.slice(0, 3),
    alerts: alerts.slice(0, 3),
  };

  return {
    rule_table_md: buildAgronomyRuleTableMarkdown(),
    input_snapshot: {
      soil_moisture: soilMoisture,
      temperature: temp,
      humidity,
      wind_speed: windSpeed,
      rain_probability: rainProbability,
      expected_rainfall_mm: expectedRainMm,
      rain_time_window: rainWindow,
      crop_type: cropType,
      crop_stage: cropStage,
      soil_type: soilType,
    },
    decisions: { spray, irrigation, sowing, harvest },
    ...jsonOutput,
    ek_line_summary: jsonOutput.summary_hi,
    risk_color: riskLevel,
    aaj_karo: jsonOutput.today_do,
    aaj_mat_karo: jsonOutput.today_dont,
    mausam_reason: jsonOutput.why_hi.join(" "),
    agli_3_din: next3.slice(0, 3),
    sabse_jaruri_kaam:
      riskLevel === "red"
        ? "Sabse pehle: spray, bowaai aur katayi rok do; pehle paani nikasi aur crop safety check karo."
        : riskLevel === "yellow"
        ? "Sabse pehle: main kaam subah me niptao, fir dopahar me data dekhkar agla step lo."
        : "Sabse pehle: aaj subah field round lo aur phir normal kaam start karo.",
  };
};

export const toSimpleDay = (dateText, index) => {
  if (!dateText) return index === 0 ? "Today" : `Day ${index + 1}`;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return index === 0 ? "Today" : `Day ${index + 1}`;
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return date.toLocaleDateString("en-IN", { weekday: "short" });
};

export const mapBackendDaily = (dailyRaw = []) =>
  dailyRaw.map((item, idx) => ({
    dayLabel: toSimpleDay(item.date, idx),
    minTemp: Math.round(Number(item.minTemp ?? 0)),
    maxTemp: Math.round(Number(item.maxTemp ?? 0)),
    rainChance: Math.round(Number(item.rainChance ?? 0)),
    emoji: weatherEmojiFromCode(item.iconCode || ""),
    description: item.condition || "Clear",
  }));

export const mockFromProp = (weather, advisoryContext = {}) => {
  const todayTemp = Number(weather?.tempC ?? 30);
  const randomSoilMoisture = Math.floor(Math.random() * 61) + 20; // 20-80%
  const list = Array.from({ length: 10 }).map((_, idx) => {
    const bump = idx % 3;
    return {
      dayLabel: idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : `Day ${idx + 1}`,
      minTemp: Math.max(12, todayTemp - 7 + bump),
      maxTemp: todayTemp + bump,
      rainChance: Math.max(5, Number(weather?.rainChance ?? 20) - idx),
      emoji: idx % 2 ? "Cloudy" : "Sunny",
      description: "Partly cloudy",
    };
  });

  const advisoryData = buildKisanWeatherAdvisory({
    current: {
      tempC: todayTemp,
      humidity: Number(weather?.humidity ?? 70),
      windKmph: Number.parseInt(String(weather?.wind || "10"), 10) || 10,
      condition: "Partly cloudy",
    },
    daily: list,
    context: {
      soilMoisture: advisoryContext.soilMoisture ?? randomSoilMoisture,
      cropType: advisoryContext.cropType || "wheat",
      cropStage: advisoryContext.cropStage || "vegetative",
      soilType: advisoryContext.soilType || "loam",
      rainTimeWindow: advisoryContext.rainTimeWindow || "3pm-7pm",
    },
  });

  return {
    place: weather?.location || "Your Farm",
    currentTemp: todayTemp,
    feelsLike: Number(weather?.feelsLikeC ?? todayTemp),
    humidity: Number(weather?.humidity ?? 70),
    wind: weather?.wind || "10 km/h",
    condition: "Partly cloudy",
    emoji: safeWeatherLabel(weather?.icon, "Partly cloudy"),
    advisory: advisoryData.summary_hi || weather?.alertAction || "Normal weather. Field monitoring continue rakho.",
    advisoryData,
    daily: list,
  };
};
