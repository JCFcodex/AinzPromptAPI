import type { Request, Response, NextFunction } from "express";
import { processChatRequest } from "@services";
import type { ChatBody } from "@schemas";

export async function chatController(
  req: Request<{}, {}, ChatBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await processChatRequest(req.body));
  } catch (err) {
    next(err);
  }
}
