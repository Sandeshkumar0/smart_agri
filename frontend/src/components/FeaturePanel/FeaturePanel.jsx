import { useState } from "react";

function SoilBar({ label, value }) {
  const width = value === "Low" ? "30%" : value === "OK" ? "65%" : "90%";
  return (
    <div className="soil-row">
      <span>{label}: {value}</span>
      <div className="soil-bar">
        <span style={{ width }} />
      </div>
    </div>
  );
}

function FeaturePanel({ feature, data, onBack, onAction }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [captured, setCaptured] = useState(false);

  if (feature === "leaf") {
    return (
      <section className="feature-panel">
        <div className="feature-head">
          <h3>Leaf Health (Camera Demo)</h3>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
        <p>Flow: Open Camera - Capture Photo - Show Result (Demo)</p>
        <div className="feature-actions">
          <button className="btn btn-primary" type="button" onClick={() => setCameraOpen(true)}>
            Open Camera
          </button>
          <button
            className="btn btn-soft"
            type="button"
            onClick={() => setCaptured(true)}
            disabled={!cameraOpen}
          >
            Capture Photo
          </button>
        </div>
        <div className="feature-result">
          {captured ? (
            <>
              <h4>{data.leafHealth.diagnosis.status}</h4>
              <p>{data.leafHealth.diagnosis.title}</p>
              <ul>
                {data.leafHealth.diagnosis.steps.slice(0, 3).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>Capture ke baad result yahan dikhega.</p>
          )}
        </div>
      </section>
    );
  }

  if (feature === "weather") {
    return (
      <section className="feature-panel">
        <div className="feature-head">
          <h3>Mausam Alert</h3>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
        <p className="feature-big">
          {data.weather.icon} {data.weather.tempC} C
        </p>
        <p>Rain chance: {data.weather.rainLabel}</p>
        <p className="feature-action-line">{data.weather.alertAction}</p>
      </section>
    );
  }

  if (feature === "water") {
    return (
      <section className="feature-panel">
        <div className="feature-head">
          <h3>Paani / Irrigation</h3>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
        <p>Moisture status: {data.water.moistureStatus}</p>
        <p>Moisture: {data.water.moisturePercent}%</p>
        <p className="feature-action-line">Aaj sinchai: {data.water.irrigationToday}</p>
      </section>
    );
  }

  if (feature === "soil") {
    return (
      <section className="feature-panel">
        <div className="feature-head">
          <h3>Mitti / NPK / pH</h3>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
        <SoilBar label="N" value={data.soil.nStatus} />
        <SoilBar label="P" value={data.soil.pStatus} />
        <SoilBar label="K" value={data.soil.kStatus} />
        <p>pH: {data.soil.ph} ({data.soil.phStatus})</p>
        <p className="feature-action-line">{data.soil.action}</p>
      </section>
    );
  }

  if (feature === "market") {
    return (
      <section className="feature-panel">
        <div className="feature-head">
          <h3>Bazaar / Mandi</h3>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
        <ul className="price-list">
          {data.market.crops.slice(0, 3).map((crop) => (
            <li key={crop.name}>
              <span>{crop.name}</span>
              <strong>
                Rs {crop.price} {crop.trend === "up" ? "↑" : "↓"}
              </strong>
            </li>
          ))}
        </ul>
        <p className="feature-action-line">{data.market.action}</p>
      </section>
    );
  }

  if (feature === "help") {
    return (
      <section className="feature-panel">
        <div className="feature-head">
          <h3>Help / Call Expert</h3>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => onAction("Call Expert coming soon")}>
          Call Expert
        </button>
        <ul className="faq-list">
          {data.help.faqs.slice(0, 3).map((faq) => (
            <li key={faq}>{faq}</li>
          ))}
        </ul>
      </section>
    );
  }

  if (
    feature === "fields" ||
    feature === "doctor" ||
    feature === "assistant" ||
    feature === "analytics"
  ) {
    const labels = {
      fields: "My Fields",
      doctor: "Crop Doctor",
      assistant: "AI Assistant",
      analytics: "Analytics",
    };

    return (
      <section className="feature-panel">
        <div className="feature-head">
          <h3>{labels[feature]}</h3>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
        <p className="feature-action-line">{labels[feature]} screen coming soon.</p>
      </section>
    );
  }

  return null;
}

export default FeaturePanel;
