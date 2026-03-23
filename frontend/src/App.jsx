import { useState } from "react";
import DemoAuthPanel from "./components/Auth/DemoAuthPanel";
import DashboardPage from "./pages/DashboardPage";
import { mockData } from "./data/mockData";

const USERS_KEY = "smart_agri_auth_users_v1";
const CURRENT_USER_KEY = "smart_agri_current_user_v1";
const SHARED_LOCATION_KEY = "smart_agri_shared_location_v1";
const FARMER_PROFILE_STATE_KEY = "smart_agri_farmer_profile_state_v1";

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const [page, setPage] = useState("home");
  const [dashboardView, setDashboardView] = useState("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [users, setUsers] = useState(() => readJson(USERS_KEY, []));
  const [currentUser, setCurrentUser] = useState(() => readJson(CURRENT_USER_KEY, null));
  const [sharedLocation, setSharedLocation] = useState(() =>
    readJson(SHARED_LOCATION_KEY, {
      label: "Kendujhar",
      lat: null,
      lon: null,
    })
  );
  const [farmerProfileState, setFarmerProfileState] = useState(() =>
    readJson(FARMER_PROFILE_STATE_KEY, {
      location: readJson(SHARED_LOCATION_KEY, {
        label: "Kendujhar",
        lat: null,
        lon: null,
      }),
      crops: [],
      soilValues: {
        nitrogen: null,
        phosphorus: null,
        potassium: null,
        ph: null,
      },
      fieldCount: mockData.fields?.length || 0,
      totalAreaAcre: 0,
      irrigationSource: "Canal",
      fertilizerChoice: "None",
      pesticideChoice: "None",
      sensorConnected: false,
      soilType: "Loam",
      season: "kharif",
      fieldList: mockData.fields || [],
      scanStats: {
        totalScans: 0,
        highRiskScans: 0,
      },
      cropDiseaseMap: {},
    })
  );
  const isLoggedIn = Boolean(currentUser?.email);

  const goDashboard = (view = "dashboard") => {
    setDashboardView(view);
    setPage("dashboard");
  };

  const handleSignup = async ({ email, password }) => {
    const exists = users.some((item) => item.email === email);
    if (exists) {
      return { ok: false, message: "Yeh email already registered hai. Login karein." };
    }

    const nextUsers = [...users, { email, password, createdAt: new Date().toISOString() }];
    setUsers(nextUsers);
    window.localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
    return { ok: true, message: "Signup ho gaya. Ab login karein." };
  };

  const handleLogin = async ({ email, password }) => {
    const account = users.find((item) => item.email === email);
    if (!account) {
      return { ok: false, message: "Account nahi mila. Pehle signup karein." };
    }
    if (account.password !== password) {
      return { ok: false, message: "Password galat hai." };
    }

    const session = { email };
    setCurrentUser(session);
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
    return { ok: true, message: "Login successful." };
  };

  const handleFarmerProfileChange = (nextPatch = {}) => {
    setFarmerProfileState((prev) => {
      const merged = {
        ...prev,
        ...nextPatch,
        soilValues: {
          ...(prev?.soilValues || {}),
          ...(nextPatch?.soilValues || {}),
        },
        scanStats: {
          ...(prev?.scanStats || {}),
          ...(nextPatch?.scanStats || {}),
        },
        cropDiseaseMap: {
          ...(prev?.cropDiseaseMap || {}),
          ...(nextPatch?.cropDiseaseMap || {}),
        },
      };
      window.localStorage.setItem(FARMER_PROFILE_STATE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const handleSharedLocationChange = (nextLocation) => {
    const normalized = {
      label: String(nextLocation?.label || "Kendujhar").trim() || "Kendujhar",
      lat: Number.isFinite(Number(nextLocation?.lat)) ? Number(nextLocation.lat) : null,
      lon: Number.isFinite(Number(nextLocation?.lon)) ? Number(nextLocation.lon) : null,
    };
    setSharedLocation(normalized);
    window.localStorage.setItem(SHARED_LOCATION_KEY, JSON.stringify(normalized));
    handleFarmerProfileChange({ location: normalized });
  };

  return (
    <>
      <DashboardPage
        appName="Smart Agri"
        profile={mockData.farmerProfile}
        onNavSelect={(view) => goDashboard(view)}
        onLogin={() => setAuthOpen(true)}
        isLoggedIn={isLoggedIn}
        data={mockData}
        initialView={dashboardView}
        sharedLocation={sharedLocation}
        onSharedLocationChange={handleSharedLocationChange}
        farmerProfileState={farmerProfileState}
        onFarmerProfileChange={handleFarmerProfileChange}
      />

      {authOpen && (
        <DemoAuthPanel
          onClose={() => setAuthOpen(false)}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      )}
    </>
  );
}

export default App;
