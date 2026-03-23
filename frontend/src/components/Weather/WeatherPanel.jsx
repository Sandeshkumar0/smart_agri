/* This component renders weather UI and uses a separate hook for all API/state logic. */
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { safeWeatherLabel } from "./weather.helpers";
import { useWeatherData } from "./useWeatherData";

function WeatherPanel({
  weather,
  fields = [],
  cropEntries = [],
  sharedLocation,
  onSharedLocationChange,
  farmerProfileState,
  onFarmerProfileChange,
}) {
  const {
    query,
    setQuery,
    selectedCrop,
    setSelectedCrop,
    cropOptions,
    weatherData,
    cropAdvisories,
    loading,
    error,
    loadByCity,
    loadByMyLocation,
  } = useWeatherData(weather, { fields, cropEntries, sharedLocation, onSharedLocationChange });

  const trendData = weatherData.daily.map((item) => ({
    day: item.dayLabel,
    max: item.maxTemp,
    min: item.minTemp,
    rain: item.rainChance,
  }));

  const advisoryData = weatherData.advisoryData || {
    ek_line_summary: weatherData.advisory || "Mausam theek hai.",
    risk_level: "Safe",
    risk_color: "green",
    aaj_karo: [],
    aaj_mat_karo: [],
    mausam_reason: "",
    agli_3_din: [],
    sabse_jaruri_kaam: weatherData.advisory || "Aaj khet ki dekh-rekh karo.",
  };
  const todayDont = advisoryData.today_dont || advisoryData.aaj_mat_karo || [];
  const whyLines = Array.isArray(advisoryData.why_hi)
    ? advisoryData.why_hi
    : String(advisoryData.mausam_reason || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

  return (
    <section className="weather-wrap">
      <article className="weather-search-card weather-simple-search-card">
        <h3 className="weather-search-title">Weather Information</h3>
        <div className="weather-search-row weather-simple-search-row">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Gaon ya sheher ka naam"
            aria-label="Location name"
            className="weather-search-input"
          />
          <select
            className="weather-search-input weather-crop-select"
            value={selectedCrop}
            onChange={(event) => setSelectedCrop(event.target.value)}
            aria-label="Select crop for advisory"
          >
            {(cropOptions.length > 0 ? cropOptions : ["wheat", "rice", "potato", "tomato"]).map((crop) => (
              <option key={crop} value={String(crop).toLowerCase()}>
                Crop: {crop}
              </option>
            ))}
          </select>
          <button type="button" className="weather-search-btn" onClick={loadByCity} disabled={loading}>
            {loading ? "Loading..." : "Get Weather"}
          </button>
          <button type="button" className="btn btn-soft" onClick={loadByMyLocation} disabled={loading}>
            Use My Location
          </button>
        </div>
        {error && <p className="weather-error-text">{error}</p>}
      </article>

      <article className="weather-search-card weather-manual-soil-card">
        <div className="weather-manual-soil-head">
          <h4>Soil Context (from Home Master Profile)</h4>
        </div>
        <div className="weather-manual-soil-grid">
          <div className="farm-location-active">Soil Type: {farmerProfileState?.soilType || "Loam"}</div>
          <div className="farm-location-active">Nitrogen: {farmerProfileState?.soilValues?.nitrogen ?? "-"}</div>
          <div className="farm-location-active">Phosphorus: {farmerProfileState?.soilValues?.phosphorus ?? "-"}</div>
          <div className="farm-location-active">Potassium: {farmerProfileState?.soilValues?.potassium ?? "-"}</div>
          <div className="farm-location-active">pH: {farmerProfileState?.soilValues?.ph ?? "-"}</div>
          <div className="farm-location-active">Update source: Home page master form</div>
        </div>
      </article>

      <article className="weather-hero weather-simple-hero">
        <div>
          <p className="weather-loc">{weatherData.place}</p>
          <h3>{weatherData.currentTemp} C</h3>
          <p className="weather-now">
            {safeWeatherLabel(weatherData.emoji, weatherData.condition)} - {weatherData.condition}
          </p>
          <p className="weather-meta">
            Feels like {weatherData.feelsLike} C | Humidity {weatherData.humidity}% | Wind {weatherData.wind}
          </p>
          <p className="weather-meta">
            Soil Moisture (dummy): {advisoryData?.input_snapshot?.soil_moisture ?? 42}%
          </p>
          <p className="weather-meta">
            Crop: {advisoryData?.input_snapshot?.crop_type || "wheat"} | Stage:{" "}
            {advisoryData?.input_snapshot?.crop_stage || "vegetative"} | Soil:{" "}
            {advisoryData?.input_snapshot?.soil_type || "loam"}
          </p>
        </div>
      </article>

      <article className="weather-chart-card weather-forecast-card">
        <h4>Weather Advisory</h4>

        <div className="weather-trend-card">
          <h5>Weather Change Trend</h5>
          <p>Temperature and rain chance across next days</p>
          <div className="weather-trend-chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e4dd" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="temp" tick={{ fontSize: 12 }} unit=" C" />
                <YAxis yAxisId="rain" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="max"
                  name="Max Temp"
                  stroke="#2f8a3a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="min"
                  name="Min Temp"
                  stroke="#1b5e95"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="rain"
                  type="monotone"
                  dataKey="rain"
                  name="Rain Chance"
                  stroke="#ef6c00"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="weather-demo-layout">
          <div className="weather-demo-block">
            <h5>Aaj Mat Karo</h5>
            <ul className="weather-point-list">
              {todayDont.length > 0 ? (
                todayDont.map((action) => <li key={action}>{action}</li>)
              ) : (
                <li>Aaj bina check kiye bada faisla mat lo.</li>
              )}
            </ul>
            <h6 className="weather-why-title">Kyu:</h6>
            <ul className="weather-why-list">
              {whyLines.slice(0, 3).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="weather-demo-block">
            <h5>Agli 3 Din</h5>
            <div className="weather-demo-next-list">
              {(advisoryData.agli_3_din || []).map((item) => (
                <div className="weather-demo-next-row" key={`${item.din}-${item.icon}`}>
                  <div className="weather-next-top">
                    <span>{item.din}</span>
                    <strong>{item.icon}</strong>
                    <span>{item.temp}</span>
                  </div>
                  <p>{item.khaas_baat}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="weather-crop-advisory-list">
          <h5>Crop-wise Advisory (Based on Added Crops)</h5>
          {(cropAdvisories || []).map((item) => (
            <div className="weather-crop-advisory-item" key={item.cropName}>
              <div className="weather-crop-advisory-head">
                <strong>{item.cropName}</strong>
                <span className={`weather-risk-chip ${String(item.risk || "green").toLowerCase()}`}>
                  Risk: {String(item.risk || "green").toUpperCase()}
                </span>
              </div>
              <p>{item.summary}</p>
              <p>
                <strong>Aaj Karo:</strong> {item.do?.[0] || "Field check karo aur pani/kaam weather ke hisab se plan karo."}
              </p>
              <p>
                <strong>Aaj Mat Karo:</strong> {item.dont?.[0] || "Bina weather check ke spray ya heavy action mat karo."}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default WeatherPanel;
