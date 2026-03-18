import { useMemo, useState } from "react";

function ColdStoragePanel({ coldStorageData }) {
  const [location, setLocation] = useState(coldStorageData.defaultLocation || "");
  const [loading, setLoading] = useState(false);
  const [selectedStorageId, setSelectedStorageId] = useState(coldStorageData.storages[0]?.id || "");

  const selectedStorage = useMemo(
    () => coldStorageData.storages.find((item) => item.id === selectedStorageId) || coldStorageData.storages[0],
    [coldStorageData.storages, selectedStorageId]
  );

  const handleFetchStorages = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`Lat ${latitude.toFixed(3)}, Lon ${longitude.toFixed(3)}`);
      },
      () => {},
      { timeout: 5000 }
    );
  };

  return (
    <section className="cold-storage-wrap">
      <article className="cold-storage-header-card">
        <h3>Cold Storage Finder</h3>
        <p>Check nearby facilities with distance, capacity and storage pricing details</p>
        <div className="cold-storage-search-row">
          <input
            type="text"
            className="cold-storage-search-input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Enter your location"
          />
          <button type="button" className="cold-storage-geo-btn" onClick={handleUseMyLocation}>
            Use My Location
          </button>
          <button type="button" className="cold-storage-search-btn" onClick={handleFetchStorages}>
            {loading ? "Fetching..." : "Find Cold Storage"}
          </button>
        </div>
      </article>

      <section className="cold-storage-list-grid">
        {coldStorageData.storages.map((storage) => (
          <button
            key={storage.id}
            type="button"
            className={`cold-storage-card ${storage.id === selectedStorage?.id ? "active" : ""}`}
            onClick={() => setSelectedStorageId(storage.id)}
          >
            <div className="cold-storage-card-top">
              <h4>{storage.name}</h4>
              <span>{storage.distanceKm} km</span>
            </div>
            <p>
              Capacity: {storage.capacityTon} ton | Available: {storage.availableTon} ton
            </p>
            <strong>Base Price: Rs {storage.basePricePerTon} / ton / month</strong>
          </button>
        ))}
      </section>

      {selectedStorage && (
        <article className="cold-storage-detail-card">
          <div className="cold-storage-detail-head">
            <h4>{selectedStorage.name}</h4>
            <span>{selectedStorage.address}</span>
          </div>
          <p className="cold-storage-contact">Contact: {selectedStorage.contact}</p>

          <div className="cold-storage-detail-grid">
            <div>
              <h5>Can Store</h5>
              <ul>
                {selectedStorage.supportedCrops.map((crop) => (
                  <li key={crop}>{crop}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5>Pricing</h5>
              <ul>
                {selectedStorage.pricing.map((row) => (
                  <li key={row.crop}>
                    {row.crop}: Rs {row.pricePerTon} / ton / month
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5>Facilities</h5>
              <ul>
                {selectedStorage.facilities.map((facility) => (
                  <li key={facility}>{facility}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}

export default ColdStoragePanel;
