function LanguageToggle({ language, onToggle }) {
  return (
    <button className="btn btn-ghost" type="button" onClick={onToggle} aria-label="Toggle language">
      {language === "EN" ? "English" : "Hindi"}
    </button>
  );
}

export default LanguageToggle;
