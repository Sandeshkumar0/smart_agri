import { useState } from "react";

function FieldsWorkspace({ fields }) {
  const [selectedId, setSelectedId] = useState("");
  const selectedField = fields.find((field) => field.id === selectedId);

  return (
    <section className="fields-workspace">
      <div className="fields-list">
        <h3>All Fields ({fields.length})</h3>
        {fields.map((field) => (
          <button
            key={field.id}
            type="button"
            className={`field-tile ${selectedId === field.id ? "active" : ""}`}
            onClick={() => setSelectedId(field.id)}
          >
            <div className="field-tile-head">
              <div>
                <p className="field-tile-name">{field.name}</p>
                <p className="field-tile-sub">
                  {field.crop} - {field.area}
                </p>
              </div>
              <span className={`field-dot dot-${field.status}`} />
            </div>
            <div className="field-progress">
              <span className={`field-progress-fill fill-${field.status}`} style={{ width: `${field.health}%` }} />
            </div>
            {field.alert && <p className={`field-alert ${field.status}`}>⚠ {field.alert}</p>}
          </button>
        ))}
      </div>

      <div className="fields-detail-panel">
        {selectedField ? (
          <div className="fields-detail-body">
            <h4>{selectedField.name}</h4>
            <p>
              {selectedField.crop} - {selectedField.area}
            </p>
            <p>Health: {selectedField.health}%</p>
            {selectedField.alert ? (
              <p className={`field-alert ${selectedField.status}`}>⚠ {selectedField.alert}</p>
            ) : (
              <p className="field-alert healthy">No active alert</p>
            )}
          </div>
        ) : (
          <div className="fields-empty">
            <p className="fields-empty-icon">🗺</p>
            <p>Select a field to view details</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default FieldsWorkspace;
