function YieldPredictorWidget({
  yieldTrend = [],
  weather = {},
  soilProfile = [],
  liveInsights = null,
  farmerProfileState = null,
  loading = false,
}) {
  const lastPoint = yieldTrend[yieldTrend.length - 1] || null;
  const expectedYield = Number(
    liveInsights?.expectedYieldTonPerAcre ?? lastPoint?.predicted ?? lastPoint?.actual ?? 0
  );
  const safeExpectedYield = Number.isFinite(expectedYield) ? expectedYield : 0;

  const peak = yieldTrend.reduce((max, item) => {
    const value = Number(item?.predicted ?? item?.actual ?? 0);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const meterPercent = peak > 0 ? Math.max(8, Math.min(100, (safeExpectedYield / peak) * 100)) : 8;
  const rainSignal = Number((liveInsights?.rainChance ?? weather?.rainChance) || 0);
  const nitrogen = Number(
    (
      farmerProfileState?.soilValues?.nitrogen ??
      liveInsights?.nitrogen ??
      (soilProfile.find((item) => item.name === "Nitrogen") || {}).value
    ) || 0
  );
  return (
    <article className="yield-predictor-card">
      <h3>Yield Predictor</h3>
      <p className="yield-predictor-sub">Expected Yield: {safeExpectedYield.toFixed(2)} Tonnes/Acre</p>
      <div className="yield-predictor-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(meterPercent)}>
        <span style={{ width: `${meterPercent}%` }} />
      </div>
      <p className="yield-predictor-foot">Based on current weather and soil health</p>
      <p className="yield-predictor-foot">Rain chance: {rainSignal}% | Nitrogen: {nitrogen}%</p>
      {loading ? <p className="yield-predictor-foot">Refreshing live insights...</p> : null}
    </article>
  );
}

export default YieldPredictorWidget;
