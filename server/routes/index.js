import { Router } from "express";
import authRoutes from "./auth.routes.js";
import farmRoutes from "./farm.routes.js";
import frontendRoutes from "./frontend.routes.js";
import scannerRoutes from "./scanner.routes.js";
import weatherRoutes from "./weather.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "smart-agri-api" });
});

router.use("/auth", authRoutes);
router.use("/farm", farmRoutes);
router.use("/frontend", frontendRoutes);
router.use("/scanner", scannerRoutes);
router.use("/weather", weatherRoutes);

export default router;
