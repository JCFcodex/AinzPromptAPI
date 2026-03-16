import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const MULTER_MAP: Record<string, [number, string]> = {
  LIMIT_FILE_SIZE: [413, "Image exceeds 4MB limit. Compress it or use a URL."],
  LIMIT_FILE_COUNT: [400, "Maximum 5 images per request."],
  LIMIT_UNEXPECTED_FILE: [400, "Wrong field name. Use 'image' or 'images'."],
};

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Multer-specific errors
  if (err instanceof multer.MulterError) {
    const [status, message] = MULTER_MAP[err.code] ?? [400, err.message];
    res.status(status).json({ error: { code: err.code, message, details: null } });
    return;
  }

  // Unsupported file type (thrown by our fileFilter)
  if (err instanceof Error && err.message.startsWith("Unsupported type")) {
    res
      .status(400)
      .json({ error: { code: "INVALID_FILE_TYPE", message: err.message, details: null } });
    return;
  }

  // Generic error
  const status = (err as { status?: number }).status ?? 500;
  const message =
    err instanceof Error ? err.message : "Internal server error";
  res.status(status).json({ error: { code: "INTERNAL_ERROR", message, details: null } });
}
