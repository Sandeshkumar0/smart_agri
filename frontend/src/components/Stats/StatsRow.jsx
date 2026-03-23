function StatsRow({ items }) {
  return (
    <section className="stats-row" aria-label="Key statistics">
      {items.map((item) => (
        <article className="stat-tile" key={item.label}>
          <div className="stat-head">
            <span className={`stat-icon icon-${item.iconTone}`}>{item.iconText}</span>
            {typeof item.trend === "number" && (
              <span className={`stat-trend ${item.trend >= 0 ? "up" : "down"}`}>
                {item.trend >= 0 ? "↑" : "↓"} {Math.abs(item.trend)}%
              </span>
            )}
          </div>
          <h3>{item.value}</h3>
          <p className="stat-label">{item.label}</p>
          <p className="stat-sub">{item.sub}</p>
        </article>
      ))}
    </section>
  );
}

export default StatsRow;
