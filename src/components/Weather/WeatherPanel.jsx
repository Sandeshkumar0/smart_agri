import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";

function WeatherPanel({ weather }) {
  const defaultCity = useMemo(() => (weather.location || "").split("-")[0].trim() || "New Delhi", [weather.location]);
  const [city, setCity] = useState(defaultCity);

  return (
    <section className="weather-wrap">
      <article className="weather-search-card">
        <h3 className="weather-search-title">
          <span aria-hidden="true">🌤</span> Weather Information
        </h3>
        <div className="weather-search-row">
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Enter city"
            aria-label="City name"
            className="weather-search-input"
          />
          <button type="button" className="weather-search-btn">
            Get Weather
          </button>
        </div>
      </article>

      <article className="weather-hero">
        <div>
          <p className="weather-loc">{weather.location}</p>
          <h3>{weather.tempC} C</h3>
          <p className="weather-now">
            {weather.icon} Partly Cloudy
          </p>
          <p className="weather-meta">
            Feels like {weather.feelsLikeC} C · Humidity {weather.humidity}% · Wind {weather.wind}
          </p>
        </div>
        <div className="weather-advisory">
          <p>AI Farm Advisory</p>
          <div>
            <strong>⚠ {weather.advisoryTitle}</strong>
            {weather.advisoryLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </div>
      </article>

      <article className="weather-chart-card">
        <h4>Today's Temperature & Humidity</h4>
        <div className="weather-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weather.hourly}>
              <defs>
                <linearGradient id="tempAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E76F51" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#E76F51" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#dceedd" />
              <XAxis dataKey="time" tick={{ fill: "#4A6741", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 36]} tick={{ fill: "#4A6741", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="temp" stroke="#E76F51" strokeWidth={3} fill="url(#tempAreaFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}

export default WeatherPanel;
