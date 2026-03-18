import { useState } from "react";

function CropDoctorPanel() {
  const [scanned, setScanned] = useState(false);

  const recentScans = [
    { id: "s1", title: "Leaf Blast", meta: "Paddy Field C - Today 9:41 AM", risk: "High" },
    { id: "s2", title: "Leaf Rust", meta: "Wheat Block B - Yesterday 4:20 PM", risk: "Med" },
    { id: "s3", title: "Healthy", meta: "Maize Plot D - 2 days ago", risk: "Low" },
  ];

  return (
    <section className="crop-doctor-layout">
      <div className="crop-doctor-left">
        <article className="scanner-card">
          <h3>AI Crop Scanner</h3>
          <div className="scanner-dropzone">
            <p className="scanner-icon">📷</p>
            <p>Tap scan to analyse your crop</p>
          </div>
          <button className="scanner-btn" type="button" onClick={() => setScanned(true)}>
            📷 Scan Crop
          </button>
          <p className="scanner-note">AI-powered detection · 94% accuracy · 50+ diseases</p>
        </article>

        <article className="recent-scans-card">
          <h4>Recent Scans</h4>
          <div className="recent-scans-list">
            {recentScans.map((scan) => (
              <div key={scan.id} className="recent-scan-row">
                <div>
                  <p className="scan-title">{scan.title}</p>
                  <p className="scan-meta">{scan.meta}</p>
                </div>
                <span className={`scan-risk ${scan.risk.toLowerCase()}`}>{scan.risk}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="crop-result-card">
        {!scanned ? (
          <div className="crop-result-empty">
            <p className="crop-result-icon">🐞</p>
            <h4>No Scan Yet</h4>
            <p>Tap "Scan Crop" to detect diseases with AI</p>
          </div>
        ) : (
          <div className="crop-result-empty">
            <p className="crop-result-icon">✅</p>
            <h4>Scan Completed</h4>
            <p>Leaf Blast risk detected. Open detailed treatment card next.</p>
          </div>
        )}
      </article>
    </section>
  );
}

export default CropDoctorPanel;
