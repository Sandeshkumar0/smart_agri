function AlertBar({
  alert,
  isAlarmEnabled,
  onEnableAlarm,
  onDismiss,
  onWhatToDo,
  showPager = false,
  pageIndex = 0,
  totalPages = 0,
  onPrev,
  onNext,
}) {
  if (!alert) {
    return null;
  }

  const levelClass = `alert-bar alert-${alert.level}`;

  return (
    <section className={levelClass} role="status">
      <div>
        <div className="alert-top-row">
          <div className="alert-heading">
            <img className="alert-logo" src="/mesys-logo.svg" alt="MESYS logo" />
            <p className="alert-label">Latest Alert</p>
          </div>
          {showPager && totalPages > 1 && (
            <div className="alert-pager" aria-label="Critical alert pagination">
              <button type="button" className="alert-pager-btn" onClick={onPrev} aria-label="Previous alert">
                {"<"}
              </button>
              <span className="alert-pager-index">
                {pageIndex + 1}/{totalPages}
              </span>
              <button type="button" className="alert-pager-btn" onClick={onNext} aria-label="Next alert">
                {">"}
              </button>
            </div>
          )}
        </div>
        <h3>{alert.message}</h3>
        {alert.whatToDo && <p className="alert-subtext">{alert.whatToDo}</p>}
      </div>
      <div className="alert-actions">
        {alert.level === "red" && (
          <>
            <button className="btn btn-soft" type="button" onClick={onEnableAlarm}>
              {isAlarmEnabled ? "Alerts On" : "Enable Alerts"}
            </button>
            <button className="btn btn-danger" type="button" onClick={onWhatToDo}>
              What to do
            </button>
            <button className="btn btn-soft" type="button" onClick={onDismiss}>
              Samajh gaya
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export default AlertBar;
