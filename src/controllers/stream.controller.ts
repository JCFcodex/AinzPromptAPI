import type { Request, Response, NextFunction } from "express";
import { processStreamRequest } from "@services";
import type { StreamMeta } from "@services";
import type { ChatBody } from "@schemas";

const KEEP_ALIVE_MS = 15_000; // Send keep-alive every 15s to prevent Render timeout

export async function streamController(
  req: Request<{}, {}, ChatBody>,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Periodic keep-alive to prevent Render free-tier 30s idle timeout
  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, KEEP_ALIVE_MS);

  try {
    let isFirst = true;
    for await (const chunk of processStreamRequest(req.body)) {
      // First yield is metadata (sessionId + model)
      if (isFirst && typeof chunk === "object") {
        const meta = chunk as StreamMeta;
        res.write(`data: ${JSON.stringify(meta)}\n\n`);
        isFirst = false;
        continue;
      }
      res.write(`data: ${chunk}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write(
      `data: [ERROR] ${err instanceof Error ? err.message : "Unknown error"}\n\n`,
    );
    res.end();
  } finally {
    clearInterval(keepAlive);
  }
}
