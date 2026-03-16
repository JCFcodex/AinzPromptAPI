import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import router from "@routes";
import { errorHandler, logger } from "@middleware";
import { env } from "@config";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(logger);
app.use(express.json({ limit: "1mb" }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(router);
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(errorHandler); // must be last

export default app;
