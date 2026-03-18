import { useEffect, useMemo, useRef, useState } from "react";
import AlertBar from "../components/AlertBar/AlertBar";
import RecentAlertsCard from "../components/Alerts/RecentAlertsCard";
import AIAssistantPanel from "../components/Assistant/AIAssistantPanel";
import SoilProfileCard from "../components/Charts/SoilProfileCard";
import YieldTrendCard from "../components/Charts/YieldTrendCard";
import ColdStoragePanel from "../components/ColdStorage/ColdStoragePanel";
import CropDoctorPanel from "../components/CropDoctor/CropDoctorPanel";
import FeaturePanel from "../components/FeaturePanel/FeaturePanel";
import FieldHealthCard from "../components/Fields/FieldHealthCard";
import FieldsWorkspace from "../components/Fields/FieldsWorkspace";
import CardGrid from "../components/Grid/CardGrid";
import FarmHeroBanner from "../components/Hero/FarmHeroBanner";
import HomeFeaturesSection from "../components/Home/HomeFeaturesSection";
import MandiPricePanel from "../components/Mandi/MandiPricePanel";
import NavBar from "../components/NavBar/NavBar";
import StatsRow from "../components/Stats/StatsRow";
import TodoPanel from "../components/TodoPanel/TodoPanel";
import VoiceFab from "../components/VoiceFab/VoiceFab";
import WeatherPanel from "../components/Weather/WeatherPanel";

function DashboardPage({
  onNavSelect,
  onLogin,
  isLoggedIn,
  data,
  initialView,
}) {
  const [alerts, setAlerts] = useState(data.alerts);
  const [toast, setToast] = useState("");
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [criticalBoxOpen, setCriticalBoxOpen] = useState(false);
  const [activeView, setActiveView] = useState(initialView || "dashboard");
  const [criticalAlertIndex, setCriticalAlertIndex] = useState(0);
  const audioContextRef = useRef(null);
  const toastTimerRef = useRef(null);

  const latestAlert = alerts[0];
  const criticalAlerts = useMemo(
    () => (data.recentAlerts || []).filter((item) => item.severity === "critical"),
    [data.recentAlerts]
  );
  const criticalCount = criticalAlerts.length;
  const currentCriticalAlert = criticalAlerts[criticalAlertIndex] || criticalAlerts[0] || null;
  const notificationCount = (data.recentAlerts || []).length;
  const shouldPaginateCriticalAlerts = criticalCount >= 2;
  const isHomeView = activeView === "home";
  const alertToShow = shouldPaginateCriticalAlerts && currentCriticalAlert
    ? {
        level: "red",
        message: currentCriticalAlert.message,
        whatToDo: `${currentCriticalAlert.field} · ${currentCriticalAlert.time}`,
      }
    : latestAlert;
  const statsItems = useMemo(
    () => [
      {
        iconText: "SP",
        iconTone: "green",
        label: "Active Crops",
        value: "5",
        sub: "4.2 ac avg size",
        trend: 12,
      },
      {
        iconText: "TR",
        iconTone: "blue",
        label: "Avg Yield Score",
        value: "72%",
        sub: "Up from 64% last season",
        trend: 8,
      },
      {
        iconText: "WA",
        iconTone: "mint",
        label: "Water Saved",
        value: "31%",
        sub: "vs traditional irrigation",
        trend: 31,
      },
      {
        iconText: "AL",
        iconTone: "orange",
        label: "Active Alerts",
        value: `${alerts.length}`,
        sub: "1 critical, 1 warning",
      },
      {
        iconText: "AI",
        iconTone: "purple",
        label: "AI Accuracy",
        value: "94%",
        sub: "Disease detection rate",
        trend: 2,
      },
    ],
    [alerts.length]
  );

  const cards = useMemo(
    () => [
      {
        id: "weather",
        icon: "🌦️",
        title: "Mausam",
        value: `${data.weather.icon} ${data.weather.tempC} C`,
        subtitle: `Rain chance: ${data.weather.rainLabel}`,
      },
      {
        id: "soil",
        icon: "🧪",
        title: "Mitti",
        value: `pH ${data.soil.ph} (${data.soil.phStatus})`,
        subtitle: `N:${data.soil.nStatus} P:${data.soil.pStatus} K:${data.soil.kStatus}`,
      },
      {
        id: "water",
        icon: "💧",
        title: "Paani",
        value: data.water.moistureStatus,
        subtitle: `Aaj sinchai: ${data.water.irrigationToday}`,
      },
      {
        id: "leaf",
        icon: "🍃",
        title: "Leaf Health",
        value: data.leafHealth.risk.toUpperCase(),
        subtitle: "Camera based check",
      },
      {
        id: "market",
        icon: "₹",
        title: "Bazaar",
        value: `Rs ${data.market.crops[0].price} ${data.market.crops[0].trend === "up" ? "↑" : "↓"}`,
        subtitle: data.market.action,
      },
    ],
    [data]
  );

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
    if (!shouldPaginateCriticalAlerts) {
      setCriticalAlertIndex(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCriticalAlertIndex((prev) => (prev + 1) % criticalCount);
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, [criticalCount, shouldPaginateCriticalAlerts]);

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
              {currentCriticalAlert.field} · {currentCriticalAlert.time}
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
        {isHomeView && <HomeFeaturesSection onSelectFeature={handleNavSelect} />}

        {isLoggedIn && (
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
            <StatsRow items={statsItems} />
            <section className="dashboard-chart-row">
              <YieldTrendCard data={data.yieldTrend} />
              <SoilProfileCard data={data.soilProfile} />
            </section>
            <section className="dashboard-lower-row">
              <RecentAlertsCard alerts={data.recentAlerts} />
              <FieldHealthCard fields={data.fieldHealth} />
            </section>
            {/* <TodoPanel tasks={data.todayTasks} /> */}
            {/* <CardGrid cards={cards} onCardClick={(id) => handleNavSelect(id)} /> */}
          </>
        ) : activeView === "fields" ? (
          <FieldsWorkspace fields={data.fields} />
        ) : activeView === "doctor" ? (
          <CropDoctorPanel />
        ) : activeView === "weather" ? (
          <WeatherPanel weather={data.weather} />
        ) : activeView === "assistant" ? (
          <AIAssistantPanel />
        ) : activeView === "mandi" ? (
          <MandiPricePanel mandiData={data.mandiPricePredictor} />
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
