import { useEffect, useMemo, useState } from "react";

const seasonCropMap = {
  kharif: ["Rice", "Maize", "Soybean", "Cotton", "Sugarcane", "Bajra"],
  rabi: ["Wheat", "Mustard", "Chickpea", "Barley", "Pea", "Potato"],
  zaid: ["Watermelon", "Cucumber", "Moong", "Pumpkin", "Muskmelon", "Tomato"],
};
const soilTypeOptions = ["Loam", "Clay", "Sandy", "Silty", "Black", "Red"];

const normalizeCrop = (value) => value.trim().toLowerCase();
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const formatCropName = (value) => {
  const clean = value.trim();
  if (!clean) {
    return "";
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const getProfileValue = (items = [], label) => {
  const match = items.find((item) => String(item?.name || "").toLowerCase() === label.toLowerCase());
  const value = Number(match?.value);
  return Number.isFinite(value) ? value : null;
};

const suggestCropBySignals = ({ n, p, k, ph, rainChance }) => {
  if (n >= 70 && rainChance >= 55 && ph >= 6.2 && ph <= 7.5) {
    return { crop: "Rice", score: 95, reason: "High nitrogen + supportive rainfall" };
  }

  if (n >= 60 && p >= 45 && rainChance <= 45 && ph >= 6 && ph <= 7.8) {
    return { crop: "Wheat", score: 91, reason: "Balanced NPK and moderate rain risk" };
  }

  if (k >= 60 && rainChance <= 38) {
    return { crop: "Maize", score: 88, reason: "Potassium support with lower rain risk" };
  }

  return { crop: "Mustard", score: 82, reason: "Safer fit for mixed soil-weather uncertainty" };
};

const buildFarmerRecommendationPoints = ({ soil, rainChance, reason, season, previousCrops }) => {
  const points = [
    `Mitti check: N ${soil.nitrogen}, P ${soil.phosphorus}, K ${soil.potassium}, pH ${soil.ph}.`,
    `Barish chance: ${Math.round(Number(rainChance) || 0)}% (location weather data).`,
  ];

  if (reason) {
    points.push(`Kyun suggest hua: ${reason}.`);
  }

  if ((previousCrops || []).length > 0) {
    points.push(`Pichhle season crop dekhkar rotation fit kiya gaya.`);
  } else {
    points.push(`Rotation better hoga agar pichhle season crop bhi fill karein.`);
  }

  points.push(`Season focus: ${String(season || "").toUpperCase() || "CURRENT"}.`);
  return points;
};

function FieldsWorkspace({
  fields,
  cropEntries = [],
  onCropEntriesChange,
  soilProfile = [],
  weather = {},
  sharedLocation,
  farmerProfileState,
  onFarmerProfileChange,
  onNotify,
}) {
  const [deletedFieldIds, setDeletedFieldIds] = useState([]);
  const [manualCrop, setManualCrop] = useState("");
  const [manualAcre, setManualAcre] = useState("");
  const [selectedSeason, setSelectedSeason] = useState(farmerProfileState?.season || "kharif");
  const [focusedCropKey, setFocusedCropKey] = useState("");
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [areaError, setAreaError] = useState("");

  const cropMap = useMemo(() => {
    const map = new Map();
    cropEntries.forEach((item) => {
      map.set(normalizeCrop(item.name), item);
    });
    return map;
  }, [cropEntries]);

  const displayedFields = useMemo(() => [...fields], [fields]);

  const visibleFields = useMemo(
    () => displayedFields.filter((field) => !deletedFieldIds.includes(field.id)),
    [displayedFields, deletedFieldIds]
  );

  const suggestedCrops = seasonCropMap[selectedSeason] || [];
  const cropDiseaseMap = farmerProfileState?.cropDiseaseMap || {};
  const normalizedCropDiseaseMap = useMemo(() => {
    const result = {};
    Object.entries(cropDiseaseMap || {}).forEach(([cropName, value]) => {
      result[normalizeCrop(cropName)] = value;
    });
    return result;
  }, [cropDiseaseMap]);

  const getDoctorStatusForCrop = (cropName) => {
    const disease = normalizedCropDiseaseMap[normalizeCrop(cropName)];
    if (!disease) {
      return {
        status: "healthy",
        alert: "Healthy",
        summary: "",
      };
    }

    const riskText = String(disease.risk || "").toLowerCase();
    const status = riskText === "high" ? "critical" : riskText === "medium" ? "warning" : "healthy";
    const diseaseName = String(disease.diseaseName || "Pest issue");

    return {
      status,
      alert: `${diseaseName} detected`,
      summary: String(disease.summary || ""),
    };
  };

  const activeSoil = useMemo(
    () => ({
      nitrogen: Number(farmerProfileState?.soilValues?.nitrogen ?? getProfileValue(soilProfile, "Nitrogen") ?? 68),
      phosphorus: Number(
        farmerProfileState?.soilValues?.phosphorus ?? getProfileValue(soilProfile, "Phosphorus") ?? 52
      ),
      potassium: Number(
        farmerProfileState?.soilValues?.potassium ?? getProfileValue(soilProfile, "Potassium") ?? 61
      ),
      ph: Number(farmerProfileState?.soilValues?.ph ?? 6.5),
    }),
    [
      farmerProfileState?.soilValues?.nitrogen,
      farmerProfileState?.soilValues?.phosphorus,
      farmerProfileState?.soilValues?.potassium,
      farmerProfileState?.soilValues?.ph,
      soilProfile,
    ]
  );
  const activeRainChance = Number(weather?.rainChance || 40);

  const updateEntries = (nextEntries) => {
    if (!onCropEntriesChange) {
      return;
    }

    onCropEntriesChange(nextEntries);
  };

  const toggleCrop = (crop) => {
    const key = normalizeCrop(crop);
    const exists = cropMap.has(key);
    const defaultSoilType = String(farmerProfileState?.soilType || "Loam");

    if (exists) {
      updateEntries(cropEntries.filter((item) => normalizeCrop(item.name) !== key));
      return;
    }

    updateEntries([
      ...cropEntries,
      {
        name: crop,
        acres: 0,
        sowingDate: "",
        lastSeasonCrop: "",
        soilType: defaultSoilType,
      },
    ]);
  };

  const addManualCrop = () => {
    const cropName = formatCropName(manualCrop);
    const acreInput = String(manualAcre || "").trim();
    const hasAcreInput = acreInput.length > 0;
    const acreValue = hasAcreInput ? Number.parseFloat(acreInput) : 0;

    if (!cropName) {
      onNotify?.("Crop name enter karein.");
      return;
    }

    if (!Number.isFinite(acreValue) || acreValue < 0) {
      onNotify?.("Valid total acre enter karein.");
      return;
    }

    const key = normalizeCrop(cropName);
    const exists = cropMap.has(key);
    const defaultSoilType = String(farmerProfileState?.soilType || "Loam");
    const maxAreaLimit = Number(farmerProfileState?.totalAreaAcre);
    const hasAreaLimit = Number.isFinite(maxAreaLimit) && maxAreaLimit > 0;
    const currentTotal = cropEntries.reduce((sum, item) => sum + (Number(item.acres) || 0), 0);
    const existingAcre = exists ? Number(cropMap.get(key)?.acres || 0) : 0;
    const nextTotalAcre = currentTotal - existingAcre + acreValue;

    if (hasAreaLimit && nextTotalAcre > maxAreaLimit) {
      setAreaError("Check your area. Total crop area profile total area se zyada hai.");
      return;
    }

    if (exists) {
      updateEntries(
        cropEntries.map((item) =>
          normalizeCrop(item.name) === key
            ? { ...item, acres: Number(acreValue.toFixed(2)) }
            : item
        )
      );
      onNotify?.(`${cropName} updated successfully.`);
    } else {
      updateEntries([
        ...cropEntries,
        {
          name: cropName,
          acres: Number(acreValue.toFixed(2)),
          sowingDate: "",
          lastSeasonCrop: "",
          soilType: defaultSoilType,
        },
      ]);
      onNotify?.(`${cropName} added successfully.`);
    }

    setAreaError("");
    setManualCrop("");
    setManualAcre("");
  };

  const updateCropAcreWithLimit = (name, nextAcreRaw) => {
    const nextAcre = Number(nextAcreRaw || 0);
    const maxAreaLimit = Number(farmerProfileState?.totalAreaAcre);
    const hasAreaLimit = Number.isFinite(maxAreaLimit) && maxAreaLimit > 0;
    const currentTotal = cropEntries.reduce((sum, item) => sum + (Number(item.acres) || 0), 0);
    const previousAcre = Number(
      cropEntries.find((item) => normalizeCrop(item.name) === normalizeCrop(name))?.acres || 0
    );
    const nextTotalAcre = currentTotal - previousAcre + nextAcre;

    if (hasAreaLimit && nextTotalAcre > maxAreaLimit) {
      const message = "Check your area. Total crop area profile total area se zyada hai.";
      setAreaError(message);
      onNotify?.(message);
      return;
    }

    setAreaError("");
    updateCropMeta(name, "acres", nextAcre);
  };

  const updateCropMeta = (name, key, value) => {
    const cropKey = normalizeCrop(name);
    updateEntries(
      cropEntries.map((item) =>
        normalizeCrop(item.name) === cropKey ? { ...item, [key]: value } : item
      )
    );
  };

  const askAiForBestCrop = async () => {
    setAiSuggestLoading(true);
    setAiSuggestion(null);
    const previousCrops = cropEntries.map((entry) => entry.lastSeasonCrop).filter(Boolean);

    try {
      const response = await fetch(`${apiBase}/frontend/crop/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soil: activeSoil,
          rainfallChance: activeRainChance,
          season: selectedSeason,
          previousCrops,
        }),
      });

      if (!response.ok) {
        throw new Error("Crop suggestion failed");
      }

      const payload = await response.json();
      const crop = String(payload.crop || "Mustard");
      const score = Number(payload.score || 80);
      const reason = String(payload.reason || "");
      setAiSuggestion({
        crop,
        score,
        points: buildFarmerRecommendationPoints({
          soil: activeSoil,
          rainChance: activeRainChance,
          reason,
          season: selectedSeason,
          previousCrops,
        }),
      });
      onNotify?.("Krishi Mitra recommendation ready");
    } catch {
      const recommendation = suggestCropBySignals({
        n: activeSoil.nitrogen,
        p: activeSoil.phosphorus,
        k: activeSoil.potassium,
        ph: activeSoil.ph,
        rainChance: activeRainChance,
      });
      setAiSuggestion({
        crop: recommendation.crop,
        score: recommendation.score,
        points: buildFarmerRecommendationPoints({
          soil: activeSoil,
          rainChance: activeRainChance,
          reason: recommendation.reason,
          season: selectedSeason,
          previousCrops,
        }),
      });
      onNotify?.("Krishi Mitra fallback recommendation ready");
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const handleDeleteField = (field) => {
    if (field.id.startsWith("added-crop-")) {
      const cropKey = normalizeCrop(field.crop);
      updateEntries(cropEntries.filter((item) => normalizeCrop(item.name) !== cropKey));
    } else {
      setDeletedFieldIds((prev) => (prev.includes(field.id) ? prev : [...prev, field.id]));
    }
  };

  const totalAcre = cropEntries.reduce((sum, item) => sum + (Number(item.acres) || 0), 0);
  const profileTotalAreaAcre = Number(farmerProfileState?.totalAreaAcre);
  const hasProfileAreaLimit = Number.isFinite(profileTotalAreaAcre) && profileTotalAreaAcre > 0;
  const remainingAreaAcre = hasProfileAreaLimit ? profileTotalAreaAcre - totalAcre : null;
  const isOverAllocated = hasProfileAreaLimit && remainingAreaAcre < 0;

  useEffect(() => {
    const defaultSoilType = String(farmerProfileState?.soilType || "Loam");
    const hasMissingSoilType = cropEntries.some((entry) => !String(entry?.soilType || "").trim());
    if (!hasMissingSoilType) {
      return;
    }

    updateEntries(
      cropEntries.map((entry) => ({
        ...entry,
        soilType: String(entry?.soilType || defaultSoilType),
      }))
    );
  }, [cropEntries, farmerProfileState?.soilType]);

  useEffect(() => {
    onFarmerProfileChange?.({
      season: selectedSeason,
      crops: cropEntries,
      fieldList: visibleFields,
    });
  }, [
    selectedSeason,
    cropEntries,
    visibleFields,
    onFarmerProfileChange,
  ]);

  return (
    <section className="fields-workspace">
      <div className="crop-onboarding-card farm-details-card">
        <div className="crop-onboarding-head">
          <h3>Master Profile (Read Only Here)</h3>
          <p>Soil, irrigation, fertilizer and pesticide values Home page se auto-sync ho rahe hain.</p>
        </div>
        <div className="farm-location-form">
          <div className="crop-onboarding-note farm-location-active">Location: {sharedLocation?.label || "Kendujhar"}</div>
          <div className="crop-onboarding-note farm-location-active">
            Irrigation: {farmerProfileState?.irrigationSource || "Canal"}
          </div>
          <div className="crop-onboarding-note farm-location-active">
            NPK/pH: N {activeSoil.nitrogen} | P {activeSoil.phosphorus} | K {activeSoil.potassium} | pH {activeSoil.ph}
          </div>
          <div className="crop-onboarding-note farm-location-active">
            Fertilizer/Pesticide: {farmerProfileState?.fertilizerChoice || "None"} / {farmerProfileState?.pesticideChoice || "None"}
          </div>
          <div className="crop-onboarding-note farm-location-active">
            Total fields: {Number(farmerProfileState?.fieldCount || 0)} | Total area limit:{" "}
            {hasProfileAreaLimit ? `${profileTotalAreaAcre.toFixed(1)} ac` : "Not set"}
          </div>
        </div>
      </div>

      <div className="crop-onboarding-card">
        <div className="crop-onboarding-head">
          <h3>Current Crops</h3>
          <p>Track sowing plan and last-season crop for rotation-aware AI.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary crop-ai-btn"
          onClick={askAiForBestCrop}
          disabled={aiSuggestLoading}
        >
          {aiSuggestLoading
            ? "Krishi Mitra analyzing Soil (NPK) + Rainfall..."
            : "Ask Krishi Mitra for Best Crop"}
        </button>
        {aiSuggestion ? (
          <div className="crop-ai-result">
            <p className="crop-ai-title">
              Recommendation: {aiSuggestion.crop} ({aiSuggestion.score}% Match)
            </p>
            <ul className="crop-ai-points">
              {aiSuggestion.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="crop-season-tabs" role="group" aria-label="Crop season">
          {Object.keys(seasonCropMap).map((season) => (
            <button
              key={season}
              type="button"
              className={`crop-season-tab ${selectedSeason === season ? "active" : ""}`}
              onClick={() => setSelectedSeason(season)}
            >
              {season.toUpperCase()}
            </button>
          ))}
        </div>

        <p className="crop-suggestion-label">Suggested {selectedSeason.toUpperCase()} crops:</p>
        <div className="crop-chip-list" role="group" aria-label="Select crops">
          {suggestedCrops.map((crop) => {
            const active = cropMap.has(normalizeCrop(crop));

            return (
              <button
                key={crop}
                type="button"
                className={`crop-chip ${active ? "active" : ""}`}
                onClick={() => toggleCrop(crop)}
                aria-pressed={active}
              >
                {crop}
              </button>
            );
          })}
        </div>

        <div className="crop-manual-form">
          <input
            type="text"
            className="crop-manual-input"
            placeholder="Manual crop name"
            value={manualCrop}
            onChange={(event) => setManualCrop(event.target.value)}
            list="season-crop-suggestions"
          />
          <datalist id="season-crop-suggestions">
            {suggestedCrops.map((crop) => (
              <option key={crop} value={crop} />
            ))}
          </datalist>
          <input
            type="number"
            min="0"
            step="0.1"
            className="crop-manual-input"
            placeholder="Total acre"
            value={manualAcre}
            onChange={(event) => setManualAcre(event.target.value)}
          />
          <button type="button" className="btn btn-primary crop-manual-btn" onClick={addManualCrop}>
            Add Crop
          </button>
        </div>

        <div className="selected-crop-list">
          {cropEntries.map((entry) => {
            const doctorStatus = getDoctorStatusForCrop(entry.name);
            const isFocused = focusedCropKey === normalizeCrop(entry.name);

            return (
            <div
              key={entry.name}
              className={`selected-crop-row selected-crop-row-extended ${isFocused ? "active" : ""}`}
            >
              <button
                type="button"
                className="crop-name-btn"
                onClick={() => setFocusedCropKey(normalizeCrop(entry.name))}
              >
                {entry.name}
              </button>
              <input
                type="number"
                min="0"
                step="0.1"
                value={entry.acres}
                onChange={(event) => updateCropAcreWithLimit(entry.name, event.target.value)}
                placeholder="Acre"
                aria-label={`${entry.name} acres`}
              />
              <input
                type="date"
                value={entry.sowingDate || ""}
                onChange={(event) => updateCropMeta(entry.name, "sowingDate", event.target.value)}
                aria-label={`${entry.name} sowing date`}
              />
              <select
                value={entry.lastSeasonCrop || ""}
                onChange={(event) => updateCropMeta(entry.name, "lastSeasonCrop", event.target.value)}
                aria-label={`${entry.name} last season crop`}
                required
              >
                <option value="">What did you grow here last season?</option>
                {[...new Set(Object.values(seasonCropMap).flat())].map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
              <select
                value={entry.soilType || farmerProfileState?.soilType || "Loam"}
                onChange={(event) => updateCropMeta(entry.name, "soilType", event.target.value)}
                aria-label={`${entry.name} soil type`}
              >
                {soilTypeOptions.map((soilType) => (
                  <option key={soilType} value={soilType}>
                    Soil: {soilType}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => handleDeleteField({ id: `added-crop-${normalizeCrop(entry.name)}`, crop: entry.name })}>
                Remove
              </button>
              <p className={`crop-disease-note risk-${doctorStatus.status}`}>
                {doctorStatus.alert}
              </p>
              {isFocused && doctorStatus.summary ? (
                <p className="crop-disease-summary">{doctorStatus.summary}</p>
              ) : null}
            </div>
            );
          })}
        </div>

        <p className="crop-onboarding-note">
          Selected: {cropEntries.length} crops | Total area: {totalAcre.toFixed(1)} ac
        </p>
        {hasProfileAreaLimit ? (
          <p className={`crop-area-balance-note ${isOverAllocated ? "error" : ""}`}>
            Used: {totalAcre.toFixed(1)} ac / {profileTotalAreaAcre.toFixed(1)} ac | Remaining:{" "}
            {Math.max(remainingAreaAcre, 0).toFixed(1)} ac
          </p>
        ) : (
          <p className="crop-area-balance-note">Home page me total area set karein to area restriction apply hoga.</p>
        )}
        {(areaError || isOverAllocated) ? (
          <p className="crop-area-balance-note error">{areaError || "Check your area."}</p>
        ) : null}
      </div>

      {/* <div className="fields-list">
        <h3>All Fields ({visibleFields.length})</h3>
        {visibleFields.map((field) => {
          const doctorStatus = getDoctorStatusForCrop(field.crop);
          const fieldStatus = doctorStatus.status;
          return (
          <div
            key={field.id}
            className="field-tile"
          >
            <div className="field-tile-head">
              <div>
                <p className="field-tile-name">{field.name}</p>
                <p className="field-tile-sub">
                  {field.crop} - {field.area}
                </p>
              </div>
              <span className={`field-dot dot-${fieldStatus}`} />
            </div>
            <div className="field-progress">
              <span className={`field-progress-fill fill-${fieldStatus}`} style={{ width: `${field.health}%` }} />
            </div>
            <p className={`field-alert ${fieldStatus}`}>
              {fieldStatus === "healthy" ? "Healthy" : doctorStatus.alert}
            </p>
            <div className="field-action-row">
              <button type="button" className="btn btn-danger" onClick={() => handleDeleteField(field)}>
                Delete
              </button>
            </div>
          </div>
          );
        })}
      </div> */}
    </section>
  );
}

export default FieldsWorkspace;
