import { createFarmerProfile } from "../models/farmer.model.js";
import { apiError, apiResponse } from "../utils/http.js";

export const demoLogin = async (req, res) => {
  const { email, name } = req.body || {};
  if (!email) {
    return apiError(res, 400, "email is required");
  }

  const farmer = await createFarmerProfile({ email, name });
  return apiResponse(res, 200, {
    message: "Login successful",
    token: `demo-${farmer.id}`,
    farmer,
  });
};

