import LanguageToggle from "../LanguageToggle/LanguageToggle";

function TopBar({
  appName,
  profile,
  language,
  onToggleLanguage,
  onBack,
  onLogin,
  isLoggedIn,
  isDashboard,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {isDashboard ? (
          <button className="btn btn-ghost topbar-nav-btn" type="button" onClick={onBack}>
            Back
          </button>
        ) : (
          <button className="btn btn-ghost topbar-nav-btn" type="button">
            Home
          </button>
        )}
        <div className="brand">
          <span className="brand-mark">SA</span>
          <div>
            <h2>{appName}</h2>
            <p>
              {profile.name} | {profile.village}
            </p>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <LanguageToggle language={language} onToggle={onToggleLanguage} />
        <button className="btn btn-ghost" type="button" onClick={onLogin}>
          {isLoggedIn ? "Profile" : "Login"}
        </button>
      </div>
    </header>
  );
}

export default TopBar;
