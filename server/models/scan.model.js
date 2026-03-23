import { randomUUID } from "node:crypto";
import { readDb, writeDb } from "../config/db.js";

export const listScans = async () => {
  const db = await readDb();
  return db.scans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const createScan = async ({ farmerId, fieldId = null, imageData, note = "" }) => {
  const db = await readDb();
  const scan = {
    id: randomUUID(),
    farmerId,
    fieldId,
    imageData,
    note,
    createdAt: new Date().toISOString(),
  };

  db.scans.push(scan);
  await writeDb(db);
  return scan;
};

