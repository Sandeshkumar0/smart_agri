import { useState } from "react";
import DemoAuthPanel from "./components/Auth/DemoAuthPanel";
import DashboardPage from "./pages/DashboardPage";
import { mockData } from "./data/mockData";

function App() {
  const [page, setPage] = useState("dashboard");
  const [dashboardView, setDashboardView] = useState("dashboard");
  const [authOpen, setAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // kept for demo auth state

  const goDashboard = (view = "dashboard") => {
    setDashboardView(view);
    setPage("dashboard");
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
      />

      {authOpen && (
        <DemoAuthPanel
          onClose={() => setAuthOpen(false)}
          onDemoLogin={() => {
            setIsLoggedIn(true);
            setAuthOpen(false);
          }}
        />
      )}
    </>
  );
}

export default App;
