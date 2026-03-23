const formatRelativeTime = (isoText = "") => {
  const date = new Date(String(isoText || ""));
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

function RecentAlertsCard({ alerts = [] }) {
  return (
    <section className="recent-alerts-card">
      <h3>Recent Alerts</h3>
      <div className="recent-alerts-list">
        {alerts.length === 0 && <p className="crop-onboarding-note">No recent alerts.</p>}
        {alerts.map((alert) => (
          <article key={alert.id} className={`recent-alert-item alert-${alert.severity}`}>
            <span className={`recent-alert-dot dot-${alert.severity}`} />
            <div>
              <p className="recent-alert-message">{alert.message}</p>
              <p className="recent-alert-meta">
                {alert.field} - {alert.time || formatRelativeTime(alert.createdAt) || "just now"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RecentAlertsCard;
