/* This file configures Express middlewares and mounts all API routes. */
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import apiRouter from "./routes/index.js";

const app = express();

app.use(cors({ origin: env.frontendOrigin === "*" ? true : env.frontendOrigin }));
app.use(express.json({ limit: "10mb" }));

app.use("/api", apiRouter);

export default app;
