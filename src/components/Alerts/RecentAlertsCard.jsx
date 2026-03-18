function RecentAlertsCard({ alerts }) {
  return (
    <section className="recent-alerts-card">
      <h3>Recent Alerts</h3>
      <div className="recent-alerts-list">
        {alerts.map((alert) => (
          <article key={alert.id} className={`recent-alert-item alert-${alert.severity}`}>
            <span className={`recent-alert-dot dot-${alert.severity}`} />
            <div>
              <p className="recent-alert-message">{alert.message}</p>
              <p className="recent-alert-meta">
                {alert.field} - {alert.time}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RecentAlertsCard;
