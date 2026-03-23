import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { writeDb } from "../config/db.js";

dotenv.config();
const databaseUrl = process.env.DATABASE_URL || "";

if (!databaseUrl) {
  console.error("DATABASE_URL missing. Add Neon connection string in server/.env");
  process.exit(1);
}

const run = async () => {
  const filePath = path.resolve("data/db.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(raw);
  await writeDb(data);
  console.log("Migration complete: data/db.json -> PostgreSQL app_state + relational tables");
};

run().catch(async (error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
