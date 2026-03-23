import { randomUUID } from "node:crypto";
import { readDb, writeDb } from "../config/db.js";

export const listCrops = async () => {
  const db = await readDb();
  return db.crops;
};

export const createCrop = async ({ name, season }) => {
  const db = await readDb();
  const crop = {
    id: randomUUID(),
    name: String(name).trim(),
    season: String(season || "").trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  db.crops.push(crop);
  await writeDb(db);
  return crop;
};

export const listFields = async () => {
  const db = await readDb();
  return db.fields;
};

export const createField = async ({ farmerId, name, areaAcre }) => {
  const db = await readDb();
  const field = {
    id: randomUUID(),
    farmerId,
    name: String(name).trim(),
    areaAcre: Number(areaAcre || 0),
    createdAt: new Date().toISOString(),
  };

  db.fields.push(field);
  await writeDb(db);
  return field;
};

