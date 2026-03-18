import { useState } from "react";

function DemoAuthPanel({ onClose, onDemoLogin }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      <div className="auth-panel">
        <div className="auth-logo-wrap">
          <img className="auth-logo-img" src="/mesys-logo.svg" alt="MESYS logo" />
        </div>
        <h3>Demo Login</h3>
        <p>OTP/PIN are UI only for Phase 1.</p>

        <input
          className="input"
          type="tel"
          maxLength={10}
          placeholder="Phone number"
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
        />
        <input
          className="input"
          type="text"
          maxLength={6}
          placeholder="OTP"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
        />
        <input
          className="input"
          type="password"
          maxLength={4}
          placeholder="Set PIN"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
        />

        <div className="auth-actions">
          <button className="btn btn-primary" type="button" onClick={onDemoLogin}>
            Demo login
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DemoAuthPanel;
