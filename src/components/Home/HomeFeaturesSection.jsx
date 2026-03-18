const homeFeatureItems = [
  {
    id: "dashboard",
    icon: "DB",
    title: "Dashboard",
    description: "Quick farm summary, alerts, trends and daily decisions in one place.",
    action: "Open Dashboard",
  },
  {
    id: "fields",
    icon: "FL",
    title: "My Fields",
    description: "Track parcels, crop health, field size and risk status for each block.",
    action: "Manage Fields",
  },
  {
    id: "doctor",
    icon: "CD",
    title: "Crop Doctor",
    description: "Scan crop photos and get simple disease guidance with action steps.",
    action: "Start Scan",
  },
  {
    id: "assistant",
    icon: "AI",
    title: "AI Assistant",
    description: "Ask in simple language and get fast recommendations for your farm.",
    action: "Ask Assistant",
  },
  {
    id: "weather",
    icon: "WT",
    title: "Weather",
    description: "See local forecast and farming advisories before irrigation or spray.",
    action: "Check Weather",
  },
  {
    id: "analytics",
    icon: "AN",
    title: "Analytics",
    description: "Review yield, water use, alerts and season performance with trends.",
    action: "View Analytics",
  },
  {
    id: "mandi",
    icon: "MP",
    title: "Mandi Price Predictor",
    description: "Track mandi rates by crop and compare increase or decrease quickly.",
    action: "View Mandi Rates",
  },
  {
    id: "cold-storage",
    icon: "CS",
    title: "Cold Storage",
    description: "Find nearby cold storage by location, capacity, distance and pricing.",
    action: "Find Storage",
  },
];

function HomeFeaturesSection({ onSelectFeature }) {
  return (
    <section className="home-features" id="platform-features">
      <div className="home-features-head">
        <h2>Platform Features</h2>
        <p>Everything you need to manage your farm efficiently</p>
      </div>

      <div className="home-features-grid">
        {homeFeatureItems.map((item) => (
          <article key={item.id} className="home-feature-card">
            <div className="home-feature-icon" aria-hidden="true">
              {item.icon}
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <button type="button" className="btn home-feature-btn" onClick={() => onSelectFeature(item.id)}>
              {item.action}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomeFeaturesSection;
