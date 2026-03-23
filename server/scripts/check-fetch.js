const BASE_URL = process.env.API_BASE_URL || "http://localhost:8000/api";

const run = async () => {
  const checks = [
    { name: "health", url: `${BASE_URL}/health`, method: "GET" },
    { name: "weather", url: `${BASE_URL}/weather/forecast10?city=goa`, method: "GET" },
    {
      name: "scanner",
      url: `${BASE_URL}/scanner/pest-detect`,
      method: "POST",
      body: { imageData: "data:image/jpeg;base64,AA==" },
    },
  ];

  for (const check of checks) {
    try {
      const response = await fetch(check.url, {
        method: check.method,
        headers: check.body ? { "Content-Type": "application/json" } : undefined,
        body: check.body ? JSON.stringify(check.body) : undefined,
      });

      const text = await response.text();
      const preview = text.length > 260 ? `${text.slice(0, 260)}...` : text;
      console.log(`[${check.name}] ${response.status} ${response.statusText}`);
      console.log(preview || "<empty>");
      console.log("");
    } catch (error) {
      console.log(`[${check.name}] request failed`);
      console.log(error?.message || String(error));
      console.log("");
    }
  }
};

run();
