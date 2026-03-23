/* This page orchestrates the full dashboard views, alerts, navigation, and feature panels. */
import { useEffect, useMemo, useRef, useState } from "react";
import AlertBar from "../components/AlertBar/AlertBar";
import RecentAlertsCard from "../components/Alerts/RecentAlertsCard";
import AIAssistantPanel from "../components/Assistant/AIAssistantPanel";
import ColdStoragePanel from "../components/ColdStorage/ColdStoragePanel";
import CropDoctorPanel from "../components/CropDoctor/CropDoctorPanel";
import FeaturePanel from "../components/FeaturePanel/FeaturePanel";
import FieldHealthCard from "../components/Fields/FieldHealthCard";
import FertilizerPesticideTracker from "../components/Fields/FertilizerPesticideTracker";
import FieldsWorkspace from "../components/Fields/FieldsWorkspace";
import YieldPredictorWidget from "../components/Fields/YieldPredictorWidget";
import CardGrid from "../components/Grid/CardGrid";
import FarmHeroBanner from "../components/Hero/FarmHeroBanner";
import HomeFeaturesSection from "../components/Home/HomeFeaturesSection";
import MandiPricePanel from "../components/Mandi/MandiPricePanel";
import NavBar from "../components/NavBar/NavBar";
import TodoPanel from "../components/TodoPanel/TodoPanel";
import VoiceFab from "../components/VoiceFab/VoiceFab";
import WeatherPanel from "../components/Weather/WeatherPanel";
import {
  buildAlertToShow,
} from "./dashboard/dashboard.helpers";

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function DashboardPage({
  onNavSelect,
  onLogin,
  isLoggedIn,
  data,
  initialView,
  sharedLocation,
  onSharedLocationChange,
  farmerProfileState,
  onFarmerProfileChange,
}) {
  const GUEST_ALLOWED_VIEWS = new Set(["home", "dashboard"]);
  const [alerts, setAlerts] = useState(data.alerts);
  const [toast, setToast] = useState("");
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [criticalBoxOpen, setCriticalBoxOpen] = useState(false);
  const [activeView, setActiveView] = useState(initialView || "dashboard");
  const [criticalAlertIndex, setCriticalAlertIndex] = useState(0);
  const [cropEntries, setCropEntries] = useState(() =>
    Array.isArray(farmerProfileState?.crops) ? farmerProfileState.crops : []
  );
  const [liveFilter, setLiveFilter] = useState({
    fertilizer: String(farmerProfileState?.fertilizerChoice || "None"),
    pesticide: String(farmerProfileState?.pesticideChoice || "None"),
    location: sharedLocation?.label || "Kendujhar",
    lat: Number.isFinite(Number(sharedLocation?.lat)) ? Number(sharedLocation.lat) : null,
    lon: Number.isFinite(Number(sharedLocation?.lon)) ? Number(sharedLocation.lon) : null,
    nitrogen: Number.isFinite(Number(farmerProfileState?.soilValues?.nitrogen))
      ? Number(farmerProfileState.soilValues.nitrogen)
      : null,
    phosphorus: Number.isFinite(Number(farmerProfileState?.soilValues?.phosphorus))
      ? Number(farmerProfileState.soilValues.phosphorus)
      : null,
    potassium: Number.isFinite(Number(farmerProfileState?.soilValues?.potassium))
      ? Number(farmerProfileState.soilValues.potassium)
      : null,
    ph: Number.isFinite(Number(farmerProfileState?.soilValues?.ph))
      ? Number(farmerProfileState.soilValues.ph)
      : null,
  });
  const [liveInsights, setLiveInsights] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [recentAlertsLive, setRecentAlertsLive] = useState(Array.isArray(data.recentAlerts) ? data.recentAlerts : []);
  const audioContextRef = useRef(null);
  const toastTimerRef = useRef(null);

  const latestAlert = alerts[0];
  const displayedRecentAlerts = useMemo(
    () => (Array.isArray(recentAlertsLive) ? recentAlertsLive : data.recentAlerts || []),
    [recentAlertsLive, data.recentAlerts]
  );
  const criticalAlerts = useMemo(
    () => displayedRecentAlerts.filter((item) => item.severity === "critical"),
    [displayedRecentAlerts]
  );
  const criticalCount = criticalAlerts.length;
  const currentCriticalAlert = criticalAlerts[criticalAlertIndex] || criticalAlerts[0] || null;
  const notificationCount = displayedRecentAlerts.length;
  const shouldPaginateCriticalAlerts = criticalCount >= 2;
  const isHomeView = activeView === "home";
  const totalCropAcre = useMemo(
    () => cropEntries.reduce((sum, item) => sum + (Number(item.acres) || 0), 0),
    [cropEntries]
  );
  const connectedSensor = Boolean(farmerProfileState?.sensorConnected);
  const soilTypeLabel = String(farmerProfileState?.soilType || "Loam");
  const irrigationSource = String(farmerProfileState?.irrigationSource || "Canal");
  const activeAlertCount = displayedRecentAlerts.length;

  const alertToShow = buildAlertToShow(shouldPaginateCriticalAlerts, currentCriticalAlert, latestAlert);

  const liveFieldHealth = useMemo(() => {
    const diseaseMap = farmerProfileState?.cropDiseaseMap || {};
    const diseaseMapNormalized = {};
    Object.entries(diseaseMap).forEach(([cropName, value]) => {
      diseaseMapNormalized[String(cropName || "").trim().toLowerCase()] = value;
    });

    if (!Array.isArray(cropEntries) || cropEntries.length === 0) {
      return [];
    }

    return cropEntries.map((entry, index) => {
      const name = String(entry?.name || `Crop ${index + 1}`).trim();
      const key = name.toLowerCase();
      const disease = diseaseMapNormalized[key];
      const acres = Number(entry?.acres || 0);

      if (!disease) {
        return {
          id: `live-${key || index}`,
          name: acres > 0 ? `${name} (${acres.toFixed(1)} ac)` : name,
          status: "healthy",
          health: 90,
        };
      }

      const risk = String(disease?.risk || "").toLowerCase();
      const status = risk === "high" ? "critical" : risk === "medium" ? "warning" : "healthy";
      const health = risk === "high" ? 45 : risk === "medium" ? 62 : 78;
      return {
        id: `live-${key || index}`,
        name: acres > 0 ? `${name} (${acres.toFixed(1)} ac)` : name,
        status,
        health,
      };
    });
  }, [cropEntries, farmerProfileState?.cropDiseaseMap]);
  const cropHealthAverage = useMemo(() => {
    if (!liveFieldHealth.length) return 0;
    const total = liveFieldHealth.reduce((sum, item) => sum + Number(item?.health || 0), 0);
    return Math.round(total / liveFieldHealth.length);
  }, [liveFieldHealth]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2000);
  };

  const playBeep = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 820;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.22);
  };

  useEffect(() => {
    if (!latestAlert || latestAlert.level !== "red" || !alarmEnabled) {
      return undefined;
    }

    playBeep();
    const timer = window.setInterval(playBeep, 1700);
    return () => window.clearInterval(timer);
  }, [latestAlert, alarmEnabled]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  useEffect(() => {
    setActiveView(initialView || "dashboard");
  }, [initialView]);

  useEffect(() => {
    setCropEntries(Array.isArray(farmerProfileState?.crops) ? farmerProfileState.crops : []);
  }, [farmerProfileState?.crops]);

  useEffect(() => {
    if (!isLoggedIn && !GUEST_ALLOWED_VIEWS.has(activeView)) {
      setActiveView("dashboard");
    }
  }, [isLoggedIn, activeView]);

  useEffect(() => {
    setLiveFilter((prev) => ({
      ...prev,
      location: sharedLocation?.label || "Kendujhar",
      lat: Number.isFinite(Number(sharedLocation?.lat)) ? Number(sharedLocation.lat) : null,
      lon: Number.isFinite(Number(sharedLocation?.lon)) ? Number(sharedLocation.lon) : null,
    }));
  }, [sharedLocation?.label, sharedLocation?.lat, sharedLocation?.lon]);

  useEffect(() => {
    setLiveFilter((prev) => ({
      ...prev,
      fertilizer: String(farmerProfileState?.fertilizerChoice || "None"),
      pesticide: String(farmerProfileState?.pesticideChoice || "None"),
      nitrogen: Number.isFinite(Number(farmerProfileState?.soilValues?.nitrogen))
        ? Number(farmerProfileState.soilValues.nitrogen)
        : null,
      phosphorus: Number.isFinite(Number(farmerProfileState?.soilValues?.phosphorus))
        ? Number(farmerProfileState.soilValues.phosphorus)
        : null,
      potassium: Number.isFinite(Number(farmerProfileState?.soilValues?.potassium))
        ? Number(farmerProfileState.soilValues.potassium)
        : null,
      ph: Number.isFinite(Number(farmerProfileState?.soilValues?.ph))
        ? Number(farmerProfileState.soilValues.ph)
        : null,
    }));
  }, [
    farmerProfileState?.fertilizerChoice,
    farmerProfileState?.pesticideChoice,
    farmerProfileState?.soilValues?.nitrogen,
    farmerProfileState?.soilValues?.phosphorus,
    farmerProfileState?.soilValues?.potassium,
    farmerProfileState?.soilValues?.ph,
  ]);

  useEffect(() => {
    if (!shouldPaginateCriticalAlerts) {
      setCriticalAlertIndex(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCriticalAlertIndex((prev) => (prev + 1) % criticalCount);
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, [criticalCount, shouldPaginateCriticalAlerts]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLiveLoading(true);
      try {
        const params = new URLSearchParams({
          fertilizer: liveFilter.fertilizer,
          pesticide: liveFilter.pesticide,
          location: liveFilter.location,
        });
        if (Number.isFinite(Number(liveFilter.lat)) && Number.isFinite(Number(liveFilter.lon))) {
          params.set("lat", String(liveFilter.lat));
          params.set("lon", String(liveFilter.lon));
        }
        if (Number.isFinite(Number(liveFilter.nitrogen))) params.set("soil_n", String(liveFilter.nitrogen));
        if (Number.isFinite(Number(liveFilter.phosphorus))) params.set("soil_p", String(liveFilter.phosphorus));
        if (Number.isFinite(Number(liveFilter.potassium))) params.set("soil_k", String(liveFilter.potassium));
        if (Number.isFinite(Number(liveFilter.ph))) params.set("soil_ph", String(liveFilter.ph));
        const query = params.toString();
        const response = await fetch(`${apiBase}/frontend/live-insights?${query}`);
        if (!response.ok) {
          throw new Error("live insights request failed");
        }
        const payload = await response.json();
        if (mounted) {
          setLiveInsights(payload);
        }
      } catch {
        if (mounted) {
          setLiveInsights(null);
        }
      } finally {
        if (mounted) {
          setLiveLoading(false);
        }
      }
    };

    run();
    const timer = window.setInterval(run, 45000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [
    liveFilter.fertilizer,
    liveFilter.pesticide,
    liveFilter.location,
    liveFilter.lat,
    liveFilter.lon,
    liveFilter.nitrogen,
    liveFilter.phosphorus,
    liveFilter.potassium,
    liveFilter.ph,
  ]);

  useEffect(() => {
    let mounted = true;

    const normalizeAlert = (alert = {}, index = 0) => {
      const severityText = String(alert?.severity || "").toLowerCase();
      const levelText = String(alert?.level || "").toLowerCase();
      const severity =
        severityText ||
        (levelText === "red"
          ? "critical"
          : levelText === "yellow"
            ? "warning"
            : levelText === "green"
              ? "success"
              : "info");
      return {
        id: String(alert?.id || `live-alert-${index}-${Date.now()}`),
        severity,
        message: String(alert?.message || "Alert update"),
        field: String(alert?.field || "My Fields"),
        time: String(alert?.time || ""),
        createdAt: alert?.createdAt || null,
      };
    };

    const run = async () => {
      try {
        const response = await fetch(`${apiBase}/frontend/dashboard`);
        if (!response.ok) throw new Error("dashboard alert request failed");
        const payload = await response.json();

        if (!mounted) return;
        if (payload?._fallback) {
          setRecentAlertsLive(Array.isArray(data.recentAlerts) ? data.recentAlerts : []);
          return;
        }

        const liveList = Array.isArray(payload?.recentAlerts) ? payload.recentAlerts : [];
        setRecentAlertsLive(liveList.map(normalizeAlert));
      } catch {
        if (mounted) {
          setRecentAlertsLive(Array.isArray(data.recentAlerts) ? data.recentAlerts : []);
        }
      }
    };

    run();
    const timer = window.setInterval(run, 20000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [data.recentAlerts]);

  const handlePrevCriticalAlert = () => {
    if (!criticalCount) {
      return;
    }

    setCriticalAlertIndex((prev) => (prev - 1 + criticalCount) % criticalCount);
  };

  const handleNextCriticalAlert = () => {
    if (!criticalCount) {
      return;
    }

    setCriticalAlertIndex((prev) => (prev + 1) % criticalCount);
  };

  const handleNavSelect = (view) => {
    if (!isLoggedIn && !GUEST_ALLOWED_VIEWS.has(view)) {
      onLogin?.();
      showToast("Pehle signup/login karein.");
      return;
    }

    setActiveView(view);
    if (onNavSelect) {
      onNavSelect(view);
    }
  };

  const dismissAlert = () => {
    if (!latestAlert || latestAlert.level !== "red") {
      return;
    }

    setAlerts((prevAlerts) =>
      prevAlerts.map((item, index) =>
        index === 0 ? { ...item, level: "yellow", message: "Red alert stopped by user." } : item
      )
    );
    setAlarmEnabled(false);
    showToast("Samajh gaya");
  };

  const handleExploreFeatures = () => {
    const section = document.getElementById("platform-features");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="app-bg">
      <div className="app-grid-overlay" />
      <main className="container">
        <NavBar
          active={activeView}
          onNavSelect={handleNavSelect}
          onLogin={onLogin}
          isLoggedIn={isLoggedIn}
          criticalCount={criticalCount}
          notificationCount={notificationCount}
          onCriticalClick={() => setCriticalBoxOpen((prev) => !prev)}
        />

        {isLoggedIn && criticalBoxOpen && currentCriticalAlert && (
          <section className="critical-popup" role="dialog" aria-label="Critical alert details">
            <div className="critical-popup-head">
              <h4>Critical Alert Details</h4>
              <button
                type="button"
                className="critical-popup-close"
                onClick={() => setCriticalBoxOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="critical-popup-title">{currentCriticalAlert.message}</p>
            <p className="critical-popup-meta">
              {currentCriticalAlert.field} • {currentCriticalAlert.time}
            </p>
            <div className="critical-popup-actions">
              <button className="btn btn-soft" type="button" onClick={() => handleNavSelect("leaf")}>
                Open What to do
              </button>
              <button className="btn btn-danger" type="button" onClick={() => setCriticalBoxOpen(false)}>
                Samajh gaya
              </button>
            </div>
          </section>
        )}

        {isHomeView && <FarmHeroBanner onExplore={handleExploreFeatures} />}
        {isHomeView && (
          <HomeFeaturesSection
            onSelectFeature={handleNavSelect}
            sharedLocation={sharedLocation}
            onSharedLocationChange={onSharedLocationChange}
            farmerProfileState={farmerProfileState}
            onFarmerProfileChange={onFarmerProfileChange}
          />
        )}

        {isLoggedIn && isHomeView && (
          <AlertBar
            alert={alertToShow}
            isAlarmEnabled={alarmEnabled}
            onEnableAlarm={() => {
              setAlarmEnabled(true);
              playBeep();
              showToast("Alert sound enabled");
            }}
            onDismiss={() => {
              if (shouldPaginateCriticalAlerts) {
                handleNextCriticalAlert();
                showToast("Samajh gaya");
                return;
              }

              dismissAlert();
            }}
            onWhatToDo={() => handleNavSelect("leaf")}
            showPager={shouldPaginateCriticalAlerts}
            pageIndex={criticalAlertIndex}
            totalPages={criticalCount}
            onPrev={handlePrevCriticalAlert}
            onNext={handleNextCriticalAlert}
          />
        )}

        {activeView === "dashboard" ? (
          <>
            <section className="dashboard-master-cards">
              <article className="dashboard-master-card stat-tile">
                <div className="stat-head">
                  <span className="stat-icon icon-green">TC</span>
                </div>
                <h3>{cropEntries.length}</h3>
                <p className="stat-label">Total Crops</p>
                <p className="stat-sub">Total area: {totalCropAcre.toFixed(1)} ac</p>
              </article>
              <article className="dashboard-master-card stat-tile">
                <div className="stat-head">
                  <span className="stat-icon icon-blue">IR</span>
                </div>
                <h3>{connectedSensor ? "Live" : "Manual"}</h3>
                <p className="stat-label">Irrigation Status</p>
                <p className="stat-sub">Source: {irrigationSource}</p>
              </article>
              <article className="dashboard-master-card stat-tile">
                <div className="stat-head">
                  <span className="stat-icon icon-orange">AL</span>
                </div>
                <h3>{activeAlertCount}</h3>
                <p className="stat-label">Active Alerts</p>
                <p className="stat-sub">Critical: {criticalCount}</p>
              </article>
              <article className="dashboard-master-card stat-tile">
                <div className="stat-head">
                  <span className="stat-icon icon-purple">CH</span>
                </div>
                <h3>{cropHealthAverage}%</h3>
                <p className="stat-label">Crop Health</p>
                <p className="stat-sub">Soil type: {soilTypeLabel}</p>
              </article>
            </section>
            {cropEntries.length === 0 && (
              <section className="dashboard-empty-state">
                <h4>Active Crops: 0</h4>
                <p>My Fields me jaake pehle crops add karein. Tabhi yield, mandi aur AI recommendations accurate hongi.</p>
                <button type="button" className="btn btn-primary" onClick={() => handleNavSelect("fields")}>
                  Add Crops in My Fields
                </button>
              </section>
            )}
            {/* <section className="dashboard-chart-row">
              <YieldTrendCard data={data.yieldTrend} />
              <SoilProfileCard data={data.soilProfile} />
            </section> */}
            <section className="dashboard-action-row">
              <YieldPredictorWidget
                yieldTrend={data.yieldTrend}
                weather={data.weather}
                soilProfile={data.soilProfile}
                liveInsights={liveInsights}
                farmerProfileState={farmerProfileState}
                loading={liveLoading}
              />
              <FertilizerPesticideTracker
                soilProfile={data.soilProfile}
                liveInsights={liveInsights}
                loading={liveLoading}
                sharedLocation={sharedLocation}
                farmerProfileState={farmerProfileState}
                onSelectionChange={(next) =>
                  setLiveFilter((prev) => ({
                    ...prev,
                    ...next,
                  }))
                }
              />
            </section>
            <section className="dashboard-lower-row">
              <RecentAlertsCard alerts={displayedRecentAlerts} />
              <FieldHealthCard fields={liveFieldHealth} />
            </section>
            {/* <TodoPanel tasks={data.todayTasks} /> */}
            {/* <CardGrid cards={cards} onCardClick={(id) => handleNavSelect(id)} /> */}
          </>
        ) : activeView === "fields" ? (
          <FieldsWorkspace
            fields={data.fields}
            cropEntries={cropEntries}
            onCropEntriesChange={(nextEntries) => {
              setCropEntries(nextEntries);
              onFarmerProfileChange?.({ crops: nextEntries });
            }}
            soilProfile={data.soilProfile}
            weather={data.weather}
            sharedLocation={sharedLocation}
            farmerProfileState={farmerProfileState}
            onFarmerProfileChange={onFarmerProfileChange}
            onNotify={showToast}
          />
        ) : activeView === "doctor" ? (
          <CropDoctorPanel
            cropEntries={cropEntries}
            onScanStatsChange={(scanStats) => onFarmerProfileChange?.({ scanStats })}
            onCropDiseaseMapChange={(cropDiseaseMap) => onFarmerProfileChange?.({ cropDiseaseMap })}
          />
        ) : activeView === "weather" ? (
          <WeatherPanel
            weather={data.weather}
            fields={data.fields}
            cropEntries={cropEntries}
            sharedLocation={sharedLocation}
            onSharedLocationChange={onSharedLocationChange}
            farmerProfileState={farmerProfileState}
            onFarmerProfileChange={onFarmerProfileChange}
          />
        ) : activeView === "assistant" ? (
          <AIAssistantPanel />
        ) : activeView === "mandi" ? (
          <MandiPricePanel mandiData={data.mandiPricePredictor} cropEntries={cropEntries} />
        ) : activeView === "cold-storage" ? (
          <ColdStoragePanel coldStorageData={data.coldStorage} />
        ) : (
          <FeaturePanel
            feature={activeView}
            data={data}
            onBack={() => handleNavSelect("dashboard")}
            onAction={showToast}
          />
        )}

        <VoiceFab onClick={() => showToast("Voice assistant coming soon")} />
        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  );
}

export default DashboardPage;
