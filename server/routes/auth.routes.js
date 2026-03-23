import { Router } from "express";
import { demoLogin } from "../controllers/auth.controller.js";
import { withFallback } from "../utils/http.js";

const router = Router();

router.post(
  "/demo-login",
  withFallback(demoLogin, {
    fallbackFactory: (req) => {
      const email = String(req?.body?.email || "demo@farmai.in").toLowerCase();
      return {
        message: "Fallback login successful",
        token: "demo-fallback-token",
        farmer: {
          id: "fallback-farmer",
          name: "Demo Farmer",
          email,
          village: "",
          createdAt: new Date().toISOString(),
        },
      };
    },
    message: "Auth service unavailable",
  })
);

export default router;
