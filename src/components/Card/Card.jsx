function Card({ icon, title, value, subtitle, onClick }) {
  return (
    <button className="metric-card" type="button" onClick={onClick}>
      <span className="metric-icon">{icon}</span>
      <p className="metric-title">{title}</p>
      <h4>{value}</h4>
      <p className="metric-subtitle">{subtitle}</p>
    </button>
  );
}

export default Card;
