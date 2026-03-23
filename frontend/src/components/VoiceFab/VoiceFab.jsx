function VoiceFab({ onClick }) {
  return (
    <button className="voice-fab" type="button" onClick={onClick} aria-label="Voice assistant">
      MIC
    </button>
  );
}

export default VoiceFab;
