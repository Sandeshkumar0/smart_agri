function NavBar({
  active,
  onNavSelect,
  onLogin,
  isLoggedIn,
  criticalCount = 0,
  notificationCount = 0,
  onCriticalClick,
}) {
  const items = [
    { id: "home", label: "Home" },
    { id: "dashboard", label: "Dashboard" },
    { id: "fields", label: "My Fields" },
    { id: "doctor", label: "Crop Doctor" },
    { id: "assistant", label: "AI Assistant" },
    { id: "weather", label: "Weather" },
    { id: "analytics", label: "Analytics" },
    { id: "mandi", label: "Mandi Price" },
    { id: "cold-storage", label: "Cold Storage" },
  ];

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <div className="navbar-logo-wrap">
            <img className="mesys-logo" src="/mesys-logo.svg" alt="MESYS logo" />
          </div>
        </div>
      </div>

      <nav className="navbar-menu" aria-label="Main navigation">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${active === item.id ? "active" : ""}`}
            type="button"
            onClick={() => onNavSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="navbar-right">
        {!isLoggedIn ? (
          <button className="btn btn-nav-ghost" type="button" onClick={onLogin}>
            Sign in
          </button>
        ) : (
          <div className="nav-user-panel">
            <button
              className="critical-alert-chip critical-alert-btn"
              type="button"
              onClick={onCriticalClick}
              aria-label="Open critical alert details"
            >
              <span className="critical-alert-icon">⚠</span>
              <span>{criticalCount} Critical Alert</span>
            </button>
            <button className="nav-bell-btn" type="button" aria-label="Notifications">
              <span className="nav-bell-icon">🔔</span>
              <span className="nav-bell-count">{notificationCount}</span>
            </button>
            <div className="nav-avatar">R</div>
          </div>
        )}
      </div>
    </header>
  );
}

export default NavBar;
