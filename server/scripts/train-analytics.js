import { trainAnalyticsModel } from "../services/analytics-ml.service.js";

const run = async () => {
  const result = await trainAnalyticsModel({ force: true, persist: true });
  console.log("Analytics model training complete");
  console.log(JSON.stringify(result.meta, null, 2));
};

run().catch((error) => {
  console.error("Training failed:", error.message);
  process.exit(1);
});
