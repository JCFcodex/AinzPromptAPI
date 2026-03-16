import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "@config";

const isProd = env.NODE_ENV === "production";

export function logger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();

  // Attach request ID for downstream use
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const entry = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId,
    };

    if (isProd) {
      console.log(JSON.stringify(entry));
    } else {
      const status = res.statusCode >= 400 ? `\x1b[31m${res.statusCode}\x1b[0m` : `\x1b[32m${res.statusCode}\x1b[0m`;
      console.log(`${req.method} ${req.path} ${status} ${duration}ms`);
    }
  });

  next();
}
