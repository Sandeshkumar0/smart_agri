import { useEffect, useMemo } from "react";

function FertilizerPesticideTracker({
  soilProfile = [],
  liveInsights = null,
  onSelectionChange,
  loading = false,
  sharedLocation,
  farmerProfileState,
}) {
  const fertilizer = String(farmerProfileState?.fertilizerChoice || "None");
  const pesticide = String(farmerProfileState?.pesticideChoice || "None");

  const nitrogenValue = useMemo(() => {
    const fromHome = Number(farmerProfileState?.soilValues?.nitrogen);
    if (Number.isFinite(fromHome)) return fromHome;
    const row = soilProfile.find((item) => String(item?.name || "").toLowerCase() === "nitrogen");
    const value = Number(row?.value || liveInsights?.nitrogen);
    return Number.isFinite(value) ? value : 0;
  }, [soilProfile, farmerProfileState?.soilValues?.nitrogen, liveInsights?.nitrogen]);

  const advisory = liveInsights?.advisory || null;
  const showNitrogenAlert = advisory
    ? String(advisory?.level || "").toLowerCase() === "warning"
    : fertilizer === "Urea" && nitrogenValue >= 70;

  useEffect(() => {
    onSelectionChange?.({
      fertilizer,
      pesticide,
      location: sharedLocation?.label || "Kendujhar",
      lat: Number.isFinite(Number(sharedLocation?.lat)) ? Number(sharedLocation.lat) : null,
      lon: Number.isFinite(Number(sharedLocation?.lon)) ? Number(sharedLocation.lon) : null,
    });
  }, [fertilizer, pesticide, sharedLocation?.label, sharedLocation?.lat, sharedLocation?.lon, onSelectionChange]);

  return (
    <article className="fertilizer-tracker-card">
      <h3>Fertilizer & Pesticide Tracker</h3>
      <p className="fertilizer-tracker-sub">Home profile ke basis par automatic recommendation.</p>
      <p className="fertilizer-tracker-foot">
        Current plan: Fertilizer <strong>{fertilizer}</strong> | Pesticide <strong>{pesticide}</strong>
      </p>
      <p className="fertilizer-tracker-foot">Weather location: {sharedLocation?.label || "Kendujhar"}</p>

      {showNitrogenAlert ? (
        <div className="fert-alert-banner" role="alert">
          {advisory?.message || `Warning: Your soil Nitrogen is already high (${nitrogenValue}%). Skip Urea to save money.`}
        </div>
      ) : (
        <p className="fertilizer-tracker-foot">
          {advisory?.message || "AI advisory load ho raha hai. Thodi der me refreshed recommendation dikhega."}
        </p>
      )}
      {loading ? <p className="fertilizer-tracker-foot">Refreshing live insights...</p> : null}
    </article>
  );
}

export default FertilizerPesticideTracker;
