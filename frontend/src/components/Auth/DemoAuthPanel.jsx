/* This modal handles account entry flow: landing screen, sign up, then login. */
import { useMemo, useState } from "react";

function DemoAuthPanel({ onClose, onLogin, onSignup }) {
  const [step, setStep] = useState("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const canSubmitSignup = useMemo(
    () => email.trim() && password.length >= 6 && confirmPassword.length >= 6,
    [email, password, confirmPassword]
  );

  const handleSignup = async () => {
    if (!canSubmitSignup) {
      setMessage("Email and password (min 6 chars) required.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Password and confirm password match nahi kar rahe.");
      return;
    }

    const result = await onSignup?.({ email: email.trim().toLowerCase(), password });
    if (!result?.ok) {
      setMessage(result?.message || "Signup failed.");
      return;
    }

    setMessage(result?.message || "Account created. Ab login karein.");
    setStep("login");
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Email and password required.");
      return;
    }

    const result = await onLogin?.({ email: email.trim().toLowerCase(), password });
    if (!result?.ok) {
      setMessage(result?.message || "Login failed.");
      return;
    }

    setMessage("");
    onClose?.();
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Account authentication">
      <div className="auth-panel auth-panel-compact">
        <div className="auth-head">
          <h3>Account</h3>
          <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close account panel">
            ×
          </button>
        </div>

        <div className="auth-logo-wrap auth-logo-wrap-small">
          <img className="auth-logo-img auth-logo-img-small" src="/mesys-logo.svg" alt="MESYS logo" />
        </div>

        {step === "landing" && (
          <div className="auth-content-block">
            <input
              className="input auth-field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="input auth-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="btn btn-primary auth-main-btn" type="button" onClick={handleLogin}>
              Log in
            </button>
            <p className="auth-switch-text">
              Don&apos;t have an account?{" "}
              <button type="button" className="auth-link-btn" onClick={() => setStep("signup")}>
                Sign up
              </button>
            </p>
          </div>
        )}

        {step === "signup" && (
          <div className="auth-content-block">
            <p className="auth-subtitle">Sign up</p>
            <input
              className="input auth-field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="input auth-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <input
              className="input auth-field"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button className="btn btn-primary auth-main-btn" type="button" onClick={handleSignup}>
              Sign up
            </button>
            <p className="auth-switch-text">
              Already have account?{" "}
              <button type="button" className="auth-link-btn" onClick={() => setStep("login")}>
                Login
              </button>
            </p>
          </div>
        )}

        {step === "login" && (
          <div className="auth-content-block">
            <p className="auth-subtitle">Login</p>
            <input
              className="input auth-field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="input auth-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="btn btn-primary auth-main-btn" type="button" onClick={handleLogin}>
              Log in
            </button>
            <p className="auth-switch-text">
              Need account?{" "}
              <button type="button" className="auth-link-btn" onClick={() => setStep("signup")}>
                Sign up
              </button>
            </p>
          </div>
        )}

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  );
}

export default DemoAuthPanel;
