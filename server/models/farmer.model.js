import { randomUUID } from "node:crypto";
import { readDb, writeDb } from "../config/db.js";

export const createFarmerProfile = async ({ email, name = "Farmer" }) => {
  const db = await readDb();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const existing = db.farmers.find((item) => item.email === normalizedEmail);
  if (existing) {
    return existing;
  }

  const farmer = {
    id: randomUUID(),
    name,
    email: normalizedEmail,
    village: "",
    createdAt: new Date().toISOString(),
  };

  db.farmers.push(farmer);
  await writeDb(db);
  return farmer;
};

