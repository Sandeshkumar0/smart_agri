function FieldHealthCard({ fields }) {
  return (
    <section className="field-health-card">
      <h3>Field Health</h3>
      <div className="field-health-list">
        {fields.map((field) => (
          <article key={field.id} className="field-health-row">
            <span className={`field-dot dot-${field.status}`} />
            <span className="field-name">{field.name}</span>
            <div className="field-progress">
              <span className={`field-progress-fill fill-${field.status}`} style={{ width: `${field.health}%` }} />
            </div>
            <strong className="field-value">{field.health}%</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FieldHealthCard;
