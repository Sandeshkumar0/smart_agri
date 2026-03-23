import { createCrop, createField, listCrops, listFields } from "../models/farm.model.js";
import { apiError, apiResponse } from "../utils/http.js";

export const getCrops = async (_req, res) => {
  const crops = await listCrops();
  return apiResponse(res, 200, { items: crops });
};

export const addCrop = async (req, res) => {
  const { name, season } = req.body || {};
  if (!name) {
    return apiError(res, 400, "name is required");
  }

  const crop = await createCrop({ name, season });
  return apiResponse(res, 201, crop);
};

export const getFields = async (_req, res) => {
  const fields = await listFields();
  return apiResponse(res, 200, { items: fields });
};

export const addField = async (req, res) => {
  const { farmerId, name, areaAcre } = req.body || {};
  if (!farmerId || !name) {
    return apiError(res, 400, "farmerId and name are required");
  }

  const field = await createField({ farmerId, name, areaAcre });
  return apiResponse(res, 201, field);
};

