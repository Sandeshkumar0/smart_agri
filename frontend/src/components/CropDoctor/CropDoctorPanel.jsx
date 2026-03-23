import { useEffect, useRef, useState } from "react";

const HISTORY_KEY = "crop_scanner_history_v1";
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const loadHistory = () => {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const riskClassFromValue = (value = "") => {
  const text = String(value || "").trim().toLowerCase();
  if (text === "high") return "high";
  if (text === "medium" || text === "med") return "med";
  if (text === "low") return "low";
  return "pending";
};

const parseFarmerResponseLines = (value = "") => {
  const text = String(value || "").trim();
  if (!text) {
    return [];
  }

  const fromNewLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (fromNewLines.length >= 2) {
    return fromNewLines;
  }

  const emojiSections = text.match(/(🐛[\s\S]*?)(?=⚠️|🌱|✅|$)|(⚠️[\s\S]*?)(?=🐛|🌱|✅|$)|(🌱[\s\S]*?)(?=🐛|⚠️|✅|$)|(✅[\s\S]*?)(?=🐛|⚠️|🌱|$)/g);
  if (emojiSections && emojiSections.length > 0) {
    return emojiSections.map((part) => part.trim()).filter(Boolean);
  }

  return fromNewLines;
};

const isUnknownLike = (value = "") => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  return [
    "unknown",
    "nahi",
    "nahin",
    "none",
    "no",
    "na",
    "null",
    "n/a",
    "koi nahi",
    "koi nahin",
    "not detected",
  ].includes(text);
};

const displayPestName = (value = "") =>
  isUnknownLike(value) ? "Clear detect nahi hua (photo dubara lo)" : String(value || "");

const displayProblemName = (value = "") =>
  isUnknownLike(value) ? "Disease clear detect nahi hui" : String(value || "");

const buildCropDiseaseMapFromHistory = (history = []) => {
  const map = {};
  history.forEach((scan) => {
    const cropName = String(scan?.cropName || "").trim();
    if (!cropName || map[cropName] || !scan?.analysis) {
      return;
    }

    map[cropName] = {
      risk: String(scan.risk || "PENDING"),
      diseaseName: String(scan.analysis.diseaseName || "Unknown"),
      pestName: String(scan.analysis.pestName || "Unknown"),
      summary: String(scan.analysis.summary || ""),
      updatedAt: String(scan.meta || ""),
    };
  });
  return map;
};

function CropDoctorPanel({ cropEntries = [], onScanStatsChange, onCropDiseaseMapChange }) {
  const initialHistory = loadHistory();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const [scanHistory, setScanHistory] = useState(initialHistory);
  const [selectedCapture, setSelectedCapture] = useState(initialHistory[0] || null);
  const [selectedScanIds, setSelectedScanIds] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCropForScan, setSelectedCropForScan] = useState(cropEntries[0]?.name || "");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
  };

  const startCamera = async (mode = facingMode) => {
    setCameraError("");

    try {
      // Pehle check kar ki permission hai ya nahi
      const permissionStatus = await navigator.permissions?.query?.({ name: "camera" });
      
      if (permissionStatus && permissionStatus.state === "denied") {
        setCameraError("❌ Camera permission DENY hai! Phone Settings → Apps → Browser → Camera → Allow karo");
        setIsCameraOn(false);
        return;
      }

      // Pehle stop kar do agar koi chal rha ho
      stopCamera();

      // Try karo basic approach pehle
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: mode }
        }
      };

      console.log("Camera request kar rha hoon with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log("Stream mila:", stream);
      streamRef.current = stream;
      
      // Video element ko attach kar
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("Stream video element ko de diya");
      }
      
      setIsCameraOn(true);
      console.log("Camera ON ho gya");
    } catch (error) {
      console.error("Camera error:", error.name, error.message);
      
      let errorMsg = "Camera open nahi ho rha 😞";
      
      if (error.name === "NotAllowedError") {
        errorMsg = "⚠️ Camera access DENY! Phone Settings mein Camera Permission ON kar";
      } else if (error.name === "NotFoundError") {
        errorMsg = "❌ Camera device phone mein nahi hai";
      } else if (error.name === "NotReadableError") {
        errorMsg = "⚠️ Camera kisi aur app se use ho rha hai - close kar aur retry kar";
      } else if (error.name === "OverconstrainedError") {
        errorMsg = "⚠️ Camera settings theek nahi, aur option try kar rha hoon...";
        
        // Fallback - try without constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
            audio: false, 
            video: true 
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
          setIsCameraOn(true);
          setCameraError("");
          return;
        } catch (fallbackError) {
          errorMsg = "Camera nahi chal rha kisi bhi tarike se 😞";
        }
      } else if (error.name === "TypeError") {
        errorMsg = "❌ getUserMedia kaam nahi kar rha - browser update kar";
      }
      
      setCameraError(errorMsg);
      setIsCameraOn(false);
    }
  };

  const updateScanItem = (id, updater) => {
    setScanHistory((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
    setSelectedCapture((prev) => (prev && prev.id === id ? updater(prev) : prev));
  };

  const analyzeImage = async (scanId, image) => {
    setIsAnalyzing(true);

    try {
      const response = await fetch(`${apiBase}/scanner/pest-detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: image,
          cropName: selectedCropForScan || "",
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Pest detection failed");
      }

      const riskClass = riskClassFromValue(payload.risk);
      updateScanItem(scanId, (item) => ({
        ...item,
        risk: String(payload.risk || "pending").toUpperCase(),
        riskClass,
        analysis: {
          pestDetected: Boolean(payload.pestDetected),
          pestName: payload.pestName || "Unknown",
          diseaseName: payload.diseaseName || "Unknown",
          summary: payload.summary || "Image analyzed.",
          confidence: payload.confidence,
          actions: Array.isArray(payload.actions) ? payload.actions : [],
          farmerResponse: payload.farmerResponse || "",
        },
      }));
    } catch (error) {
      updateScanItem(scanId, (item) => ({
        ...item,
        risk: "PENDING",
        riskClass: "pending",
        analysis: {
          pestDetected: false,
          pestName: "Unknown",
          diseaseName: "Unknown",
          summary: error.message || "Detection failed",
          confidence: null,
          actions: ["Network/API check karein", "Image dobara clear light me scan karein"],
          farmerResponse: "",
        },
      }));
      setCameraError(error.message || "Detection failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addScanFromImage = (image, title) => {
    const now = new Date();
    const cropName = String(selectedCropForScan || cropEntries[0]?.name || "").trim();
    const item = {
      id: `scan-${Date.now()}`,
      title,
      meta: now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      risk: "PENDING",
      riskClass: "pending",
      image,
      cropName,
      analysis: null,
    };

    setScanHistory((prev) => [item, ...prev].slice(0, 20));
    setSelectedCapture(item);
    analyzeImage(item.id, image);
  };

  const toggleScanSelection = (id) => {
    setSelectedScanIds((prev) =>
      prev.includes(id) ? prev.filter((scanId) => scanId !== id) : [...prev, id]
    );
  };

  const deleteScanRecords = (ids = []) => {
    if (ids.length === 0) {
      return;
    }

    const removeSet = new Set(ids);
    setScanHistory((prev) => {
      const remaining = prev.filter((scan) => !removeSet.has(scan.id));
      setSelectedScanIds((current) => current.filter((scanId) => !removeSet.has(scanId)));
      setSelectedCapture((current) => {
        if (!current) {
          return remaining[0] || null;
        }
        if (removeSet.has(current.id)) {
          return remaining[0] || null;
        }
        return remaining.some((scan) => scan.id === current.id) ? current : remaining[0] || null;
      });
      return remaining;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedScanIds.length === 0) {
      return;
    }

    const label =
      selectedScanIds.length === 1
        ? "Delete this selected scan?"
        : `Delete ${selectedScanIds.length} selected scans?`;
    if (!window.confirm(label)) {
      return;
    }

    deleteScanRecords(selectedScanIds);
  };

  const handleDeleteSingle = (id) => {
    if (!window.confirm("Delete this scan record?")) {
      return;
    }
    deleteScanRecords([id]);
  };

  const capturePhoto = () => {
    if (!selectedCropForScan) {
      setCameraError("Pehle crop select karein.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isCameraOn) {
      setCameraError("Pehle camera start karein.");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setCameraError("Camera frame ready nahi hai. 1 second baad try karein.");
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Photo capture failed. Dobara try karein.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const image = canvas.toDataURL("image/jpeg", 0.88);
    addScanFromImage(image, "Camera Capture");
  };

  const handleFileUpload = (event) => {
    if (!selectedCropForScan) {
      setCameraError("Pehle crop select karein.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      setCameraError("File select nahi hua");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setCameraError("Sirf image file upload kar sakde ho");
      event.target.value = "";
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setCameraError("File bahut bada hai (10MB se kam hona chahiye)");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const image = String(reader.result || "");
      if (!image) {
        setCameraError("Image read nahi ho paaya, dobara try kar");
        event.target.value = "";
        return;
      }
      addScanFromImage(image, "Uploaded Image");
      event.target.value = "";
    };
    
    reader.onerror = () => {
      setCameraError("Image upload mein error");
      event.target.value = "";
    };
    
    reader.onabort = () => {
      setCameraError("Upload cancel ho gya");
      event.target.value = "";
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      setCameraError("File read nahi ho ska");
      event.target.value = "";
    }
  };

  const rotateCamera = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(scanHistory));
  }, [scanHistory]);

  useEffect(() => {
    const highRiskScans = scanHistory.filter((scan) => String(scan.risk || "").toUpperCase() === "HIGH").length;
    onScanStatsChange?.({
      totalScans: scanHistory.length,
      highRiskScans,
    });
  }, [scanHistory, onScanStatsChange]);

  useEffect(() => {
    const firstCrop = cropEntries[0]?.name || "";
    setSelectedCropForScan((prev) => (prev ? prev : firstCrop));
  }, [cropEntries]);

  useEffect(() => {
    onCropDiseaseMapChange?.(buildCropDiseaseMapFromHistory(scanHistory));
  }, [scanHistory, onCropDiseaseMapChange]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!isCameraOn || !video || !stream) {
      return;
    }

    // Attach stream to video element if not already attached
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    // Start playing video
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        setCameraError("Video play nahi ho rha, camera dobara try kar");
      });
    }
  }, [isCameraOn]);

  useEffect(() => () => stopCamera(), []);

  return (
    <section className="crop-doctor-layout">
      <div className="crop-doctor-left">
        <article className="crop-onboarding-card">
          <div className="crop-onboarding-head">
            <h3>Crops You Are Growing</h3>
            <p>Synced from Current Crops</p>
          </div>
          <div className="crop-chip-list">
            {cropEntries.length > 0 ? (
              cropEntries.map((entry) => (
                <span key={entry.name} className="crop-chip active">
                  {entry.name} ({Number(entry.acres || 0).toFixed(1)} ac)
                </span>
              ))
            ) : (
              <p className="crop-onboarding-note">No crops added yet from Current Crops screen.</p>
            )}
          </div>
        </article>

        <article className="scanner-card">
          <div className="scanner-head">
            <h3>AI Crop Scanner </h3>
            <span className={`scanner-status ${isCameraOn ? "live" : "idle"}`}>
              {isCameraOn ? "Live Camera" : "Camera Off"}
            </span>
          </div>

          <div className="crop-manual-form crop-doctor-crop-select-row">
            <select
              className="crop-manual-input"
              value={selectedCropForScan}
              onChange={(event) => setSelectedCropForScan(event.target.value)}
              aria-label="Select crop for disease scan"
            >
              {cropEntries.length === 0 ? (
                <option value="">No crops available. Add crops in My Fields first.</option>
              ) : (
                cropEntries.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    Scan for: {entry.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="scanner-dropzone camera-live-box">
            {isCameraOn ? (
              <video ref={videoRef} className="scanner-video" autoPlay muted playsInline />
            ) : (
              <div className="scanner-placeholder">
                <p className="scanner-icon">CAM</p>
                <p className="scanner-placeholder-title">Start camera to preview crop live</p>
                <p className="scanner-placeholder-sub">Capture a clear leaf photo for better pest detection</p>
              </div>
            )}
          </div>

          <div className="scanner-controls">
            {!isCameraOn ? (
              <button className="scanner-btn" type="button" onClick={() => startCamera()}>
                Start Camera
              </button>
            ) : (
              <button className="scanner-btn" type="button" onClick={capturePhoto} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : "Click Photo"}
              </button>
            )}
            <button className="btn btn-soft" type="button" onClick={rotateCamera}>
              Switch Camera
            </button>
            {isCameraOn && (
              <button className="btn btn-soft" type="button" onClick={stopCamera}>
                Stop Camera
              </button>
            )}
            <label className="btn btn-soft scanner-upload-btn">
              Upload Image
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                hidden
              />
            </label>
          </div>

          {cameraError && (
            <div className="scanner-error-box">
              <p className="scanner-error">{cameraError}</p>
              <button 
                type="button" 
                className="btn btn-retry"
                onClick={() => startCamera()}
              >
                🔄 Phir Se Try Kar
              </button>
            </div>
          )}
          <p className="scanner-note">Tip: clear light and close leaf photo gives better result</p>
          <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden="true" />
        </article>

        <article className="recent-scans-card">
          <div className="recent-scans-head">
            <h4>Recent Scans</h4>
            <button
              type="button"
              className="btn btn-danger recent-scan-delete-selected"
              onClick={handleDeleteSelected}
              disabled={selectedScanIds.length === 0}
            >
              Delete Selected ({selectedScanIds.length})
            </button>
          </div>
          <div className="recent-scans-list">
            {scanHistory.length === 0 ? (
              <p className="scan-meta">No captures yet</p>
            ) : (
              scanHistory.map((scan) => (
                <div
                  key={scan.id}
                  className={`recent-scan-row ${selectedCapture?.id === scan.id ? "active" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="recent-scan-check"
                    checked={selectedScanIds.includes(scan.id)}
                    onChange={() => toggleScanSelection(scan.id)}
                    aria-label={`Select ${scan.title}`}
                  />
                  <button
                    type="button"
                    className="recent-scan-btn"
                    onClick={() => setSelectedCapture(scan)}
                  >
                    <img src={scan.image} alt="Captured crop" className="recent-scan-thumb" />
                    <div>
                      <p className="scan-title">{scan.title}</p>
                      {scan.cropName ? <p className="scan-meta">Crop: {scan.cropName}</p> : null}
                      <p className="scan-meta">{scan.meta}</p>
                    </div>
                  </button>
                  <span className={`scan-risk ${scan.riskClass || "pending"}`}>{scan.risk}</span>
                  <button
                    type="button"
                    className="recent-scan-delete"
                    onClick={() => handleDeleteSingle(scan.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <article className="crop-result-card">
        {!selectedCapture ? (
          <div className="crop-result-empty">
            <p className="crop-result-icon">??</p>
            <h4>No Scan Yet</h4>
            <p>Start camera and click photo to save in history</p>
          </div>
        ) : (
          <div className="crop-result-preview">
            <img src={selectedCapture.image} alt="Selected crop capture" className="crop-result-image" />
            <h4>{selectedCapture.title}</h4>
            {selectedCapture.cropName ? <p>Crop: {selectedCapture.cropName}</p> : null}
            <p>{selectedCapture.meta}</p>
            {selectedCapture.analysis ? (
              <div className="crop-analysis-box">
                <div className="crop-analysis-head">
                  <p className={`scan-risk ${selectedCapture.riskClass || "pending"}`}>
                    ⚠️ Risk: {selectedCapture.risk}
                  </p>
                </div>

                <div className="crop-analysis-stats">
                  <p>🐛 Keeda: {displayPestName(selectedCapture.analysis.pestName)}</p>
                  <p>🦠 Problem: {displayProblemName(selectedCapture.analysis.diseaseName)}</p>
                  <p>
                    🎯 Vishwas:{" "}
                    {selectedCapture.analysis.confidence === null ? "N/A" : `${selectedCapture.analysis.confidence}%`}
                  </p>
                </div>

                <p className="crop-analysis-summary">{selectedCapture.analysis.summary}</p>

                {selectedCapture.analysis.farmerResponse && (
                  <div className="crop-analysis-farmer">
                    <h5>Krishi Sevak Salah</h5>
                    <div className="crop-farmer-lines">
                      {parseFarmerResponseLines(selectedCapture.analysis.farmerResponse).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCapture.analysis.actions?.length > 0 && (
                  <ul className="crop-analysis-actions">
                    {selectedCapture.analysis.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="crop-result-note">Analysis pending...</p>
            )}
          </div>
        )}
      </article>
    </section>
  );
}

export default CropDoctorPanel;
