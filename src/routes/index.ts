import { Router } from "express";
import chatRoutes from "./chat.routes.js";

const router = Router();
router.use("/api", chatRoutes);

export default router;
