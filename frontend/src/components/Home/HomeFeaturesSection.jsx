import { useEffect, useState } from "react";

const homeFeatureItems = [
  {
    id: "dashboard",
    icon: "DB",
    title: "Dashboard",
    description: "Quick farm summary, alerts, trends and daily decisions in one place.",
    action: "Open Dashboard",
  },
  {
    id: "fields",
    icon: "FL",
    title: "My Fields",
    description: "Track parcels, crop health, field size and risk status for each block.",
    action: "Manage Fields",
  },
  {
    id: "doctor",
    icon: "CD",
    title: "Crop Doctor",
    description: "Scan crop photos and get simple disease guidance with action steps.",
    action: "Start Scan",
  },
  {
    id: "assistant",
    icon: "AI",
    title: "AI Assistant",
    description: "Ask in simple language and get fast recommendations for your farm.",
    action: "Ask Assistant",
  },
  {
    id: "weather",
    icon: "WT",
    title: "Weather",
    description: "See local forecast and farming advisories before irrigation or spray.",
    action: "Check Weather",
  },
  {
    id: "analytics",
    icon: "AN",
    title: "Analytics",
    description: "Review yield, water use, alerts and season performance with trends.",
    action: "View Analytics",
  },
  {
    id: "mandi",
    icon: "MP",
    title: "Mandi Price Predictor",
    description: "Track mandi rates by crop and compare increase or decrease quickly.",
    action: "View Mandi Rates",
  },
  {
    id: "cold-storage",
    icon: "CS",
    title: "Cold Storage",
    description: "Find nearby cold storage by location, capacity, distance and pricing.",
    action: "Find Storage",
  },
];

function HomeFeaturesSection({
  onSelectFeature,
  sharedLocation,
  onSharedLocationChange,
  farmerProfileState,
  onFarmerProfileChange,
}) {
  const [locationDraft, setLocationDraft] = useState(sharedLocation?.label || "Kendujhar");
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [masterForm, setMasterForm] = useState({
    fieldCount: Number(farmerProfileState?.fieldCount ?? farmerProfileState?.fieldList?.length ?? 0),
    totalAreaAcre: Number(
      farmerProfileState?.totalAreaAcre ??
        (farmerProfileState?.crops || []).reduce((sum, item) => sum + (Number(item?.acres) || 0), 0)
    ),
    nitrogen: Number(farmerProfileState?.soilValues?.nitrogen || 0),
    phosphorus: Number(farmerProfileState?.soilValues?.phosphorus || 0),
    potassium: Number(farmerProfileState?.soilValues?.potassium || 0),
    ph: Number(farmerProfileState?.soilValues?.ph || 6.5),
    irrigationSource: String(farmerProfileState?.irrigationSource || "Canal"),
    fertilizerChoice: String(farmerProfileState?.fertilizerChoice || "None"),
    pesticideChoice: String(farmerProfileState?.pesticideChoice || "None"),
  });

  useEffect(() => {
    setLocationDraft(sharedLocation?.label || "Kendujhar");
  }, [sharedLocation?.label]);

  useEffect(() => {
    setMasterForm((prev) => ({
      ...prev,
      fieldCount: Number(farmerProfileState?.fieldCount ?? prev.fieldCount ?? 0),
      totalAreaAcre: Number(farmerProfileState?.totalAreaAcre ?? prev.totalAreaAcre ?? 0),
      nitrogen: Number(farmerProfileState?.soilValues?.nitrogen || prev.nitrogen || 0),
      phosphorus: Number(farmerProfileState?.soilValues?.phosphorus || prev.phosphorus || 0),
      potassium: Number(farmerProfileState?.soilValues?.potassium || prev.potassium || 0),
      ph: Number(farmerProfileState?.soilValues?.ph || prev.ph || 6.5),
      irrigationSource: String(farmerProfileState?.irrigationSource || prev.irrigationSource || "Canal"),
      fertilizerChoice: String(farmerProfileState?.fertilizerChoice || prev.fertilizerChoice || "None"),
      pesticideChoice: String(farmerProfileState?.pesticideChoice || prev.pesticideChoice || "None"),
    }));
  }, [
    farmerProfileState?.fieldCount,
    farmerProfileState?.totalAreaAcre,
    farmerProfileState?.soilValues?.nitrogen,
    farmerProfileState?.soilValues?.phosphorus,
    farmerProfileState?.soilValues?.potassium,
    farmerProfileState?.soilValues?.ph,
    farmerProfileState?.irrigationSource,
    farmerProfileState?.fertilizerChoice,
    farmerProfileState?.pesticideChoice,
  ]);

  const updateMasterForm = (key, value) => {
    setMasterForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveMasterProfile = () => {
    onFarmerProfileChange?.({
      fieldCount: Number(masterForm.fieldCount) || 0,
      totalAreaAcre: Number(masterForm.totalAreaAcre) || 0,
      soilValues: {
        nitrogen: Number(masterForm.nitrogen) || null,
        phosphorus: Number(masterForm.phosphorus) || null,
        potassium: Number(masterForm.potassium) || null,
        ph: Number(masterForm.ph) || null,
      },
      irrigationSource: masterForm.irrigationSource,
      fertilizerChoice: masterForm.fertilizerChoice,
      pesticideChoice: masterForm.pesticideChoice,
    });
    setLocationStatus("Master profile saved. Ye data Dashboard, Weather, My Fields aur AI modules me use hoga.");
  };

  const saveLocation = () => {
    const nextLabel = String(locationDraft || "").trim();
    onSharedLocationChange?.({
      label: nextLabel || "Kendujhar",
      lat: null,
      lon: null,
    });
    setLocationStatus("Saved. Ab ye location Weather, Yield Predictor aur Crop AI me use hogi.");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Is browser me auto-location support nahi hai.");
      return;
    }

    setIsLocating(true);
    setLocationStatus("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords?.latitude);
        const lon = Number(position.coords?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          setLocationStatus("Location read nahi ho payi. Manual city enter karein.");
          setIsLocating(false);
          return;
        }

        const label = `Lat ${lat.toFixed(3)}, Lon ${lon.toFixed(3)}`;
        setLocationDraft(label);
        onSharedLocationChange?.({ label, lat, lon });
        setLocationStatus("Auto-location set. OpenWeather se live rain/forecast isi ke basis pe aayega.");
        setIsLocating(false);
      },
      () => {
        setLocationStatus("Location permission deny ho gayi. Manual city use karein.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    );
  };

  return (
    <section className="home-features" id="platform-features">
      <div className="home-features-head">
        <h2>Platform Features</h2>
      </div>

      <div className="home-location-card">
        <div className="home-location-head">
          <p className="home-location-title">Set Farm Location Once</p>
          <span className="home-location-badge">Shared Across App</span>
        </div>

        <div className="home-location-row">
          <input
            type="text"
            className="crop-manual-input"
            value={locationDraft}
            onChange={(event) => {
              setLocationDraft(event.target.value);
              setLocationStatus("");
            }}
            placeholder="City, district, or village"
            aria-label="Farm location"
          />
          <button type="button" className="btn btn-primary" onClick={saveLocation}>
            Save Location
          </button>
          <button type="button" className="btn btn-soft" onClick={useMyLocation} disabled={isLocating}>
            {isLocating ? "Detecting..." : "Use My Location"}
          </button>
        </div>

        {locationStatus ? <p className="home-location-status">{locationStatus}</p> : null}
      </div>

      <div className="home-master-card">
        <div className="home-location-head">
          <p className="home-location-title">Farmer Profile Setup (Single Entry for All Pages)</p>
          <span className="home-location-badge">Master Data Hub</span>
        </div>

        <div className="home-master-grid">
          <input
            type="number"
            className="crop-manual-input"
            placeholder="Total fields"
            value={masterForm.fieldCount}
            onChange={(event) => updateMasterForm("fieldCount", event.target.value)}
          />
          <input
            type="number"
            className="crop-manual-input"
            placeholder="Total area (acre)"
            value={masterForm.totalAreaAcre}
            onChange={(event) => updateMasterForm("totalAreaAcre", event.target.value)}
          />
          <select
            className="crop-manual-input"
            value={masterForm.irrigationSource}
            onChange={(event) => updateMasterForm("irrigationSource", event.target.value)}
          >
            {["Canal", "Tube-well", "Rainfed"].map((item) => (
              <option key={item} value={item}>
                Irrigation: {item}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="crop-manual-input"
            placeholder="Nitrogen (N)"
            value={masterForm.nitrogen}
            onChange={(event) => updateMasterForm("nitrogen", event.target.value)}
          />
          <input
            type="number"
            className="crop-manual-input"
            placeholder="Phosphorus (P)"
            value={masterForm.phosphorus}
            onChange={(event) => updateMasterForm("phosphorus", event.target.value)}
          />
          <input
            type="number"
            className="crop-manual-input"
            placeholder="Potassium (K)"
            value={masterForm.potassium}
            onChange={(event) => updateMasterForm("potassium", event.target.value)}
          />
          <input
            type="number"
            step="0.1"
            className="crop-manual-input"
            placeholder="pH Level"
            value={masterForm.ph}
            onChange={(event) => updateMasterForm("ph", event.target.value)}
          />
          <select
            className="crop-manual-input"
            value={masterForm.fertilizerChoice}
            onChange={(event) => updateMasterForm("fertilizerChoice", event.target.value)}
          >
            {["None", "Urea", "DAP", "MOP", "NPK Blend"].map((item) => (
              <option key={item} value={item}>
                Fertilizer: {item}
              </option>
            ))}
          </select>
          <select
            className="crop-manual-input"
            value={masterForm.pesticideChoice}
            onChange={(event) => updateMasterForm("pesticideChoice", event.target.value)}
          >
            {["None", "Neem Oil", "Imidacloprid", "Chlorpyrifos"].map((item) => (
              <option key={item} value={item}>
                Pesticide: {item}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary home-master-save" onClick={saveMasterProfile}>
            Save Master Profile
          </button>
        </div>
      </div>

      <div className="home-features-grid">
        {homeFeatureItems.map((item) => (
          <article key={item.id} className="home-feature-card">
            <div className="home-feature-icon" aria-hidden="true">
              {item.icon}
            </div>
            <h3>{item.title}</h3>
            <button type="button" className="btn home-feature-btn" onClick={() => onSelectFeature(item.id)}>
              {item.action}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomeFeaturesSection;
