/* This file starts the Node + Express API server on configured port. */
import app from "./app.js";
import { initializeDatabase } from "./config/db.js";
import { env } from "./config/env.js";

const start = async () => {
  await initializeDatabase();
  app.listen(env.port, () => {
    console.log(`Smart Agri API running on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
