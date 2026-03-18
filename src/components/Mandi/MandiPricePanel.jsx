import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function MandiPricePanel({ mandiData }) {
  const [location, setLocation] = useState(mandiData.defaultLocation || "");
  const [loading, setLoading] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState(mandiData.markets[0]?.id || "");

  const selectedMarket =
    mandiData.markets.find((market) => market.id === selectedMarketId) || mandiData.markets[0];

  const chartData = useMemo(
    () =>
      (selectedMarket?.crops || []).map((crop) => ({
        crop: crop.name,
        current: crop.currentPrice,
        previous: crop.previousPrice,
      })),
    [selectedMarket]
  );

  const handleFetchRates = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  return (
    <section className="mandi-wrap">
      <article className="mandi-header-card">
        <h3>Mandi Price Predictor</h3>
        <p>Live-style rates by crop, increase/decrease trend and location-wise market summary</p>
        <div className="mandi-search-row">
          <input
            type="text"
            className="mandi-search-input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Enter mandi location"
          />
          <button type="button" className="mandi-search-btn" onClick={handleFetchRates}>
            {loading ? "Fetching..." : "Get Mandi Price"}
          </button>
        </div>
      </article>

      <section className="mandi-market-grid">
        {mandiData.markets.map((market) => (
          <button
            key={market.id}
            type="button"
            className={`mandi-market-card ${market.id === selectedMarket?.id ? "active" : ""}`}
            onClick={() => setSelectedMarketId(market.id)}
          >
            <div className="mandi-market-top">
              <h4>{market.name}</h4>
              <span>{market.distanceKm} km</span>
            </div>
            <p>{market.district}</p>
            <strong>{market.crops.length} major crops tracked</strong>
          </button>
        ))}
      </section>

      <article className="mandi-chart-card">
        <div className="mandi-chart-head">
          <h4>Current vs Previous Price ({selectedMarket?.name})</h4>
          <p>Rs per quintal</p>
        </div>
        <div className="mandi-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dceedd" />
              <XAxis dataKey="crop" tick={{ fill: "#4A6741", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4A6741", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="current" fill="#2f9a57" radius={[6, 6, 0, 0]} />
              <Bar dataKey="previous" fill="#9bcfa8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="mandi-crop-list-card">
        <h4>Crop-wise Price Snapshot</h4>
        <div className="mandi-crop-list">
          {(selectedMarket?.crops || []).map((crop) => {
            const diff = crop.currentPrice - crop.previousPrice;
            const isUp = diff >= 0;
            return (
              <div key={crop.name} className="mandi-crop-item">
                <div>
                  <h5>{crop.name}</h5>
                  <p>
                    Current: Rs {crop.currentPrice} | Previous: Rs {crop.previousPrice}
                  </p>
                </div>
                <div className={`mandi-trend ${isUp ? "up" : "down"}`}>
                  {isUp ? "+" : ""}
                  {diff}
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

export default MandiPricePanel;
