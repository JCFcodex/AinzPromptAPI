import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  ALLOWED_MIME.includes(file.mimetype)
    ? cb(null, true)
    : cb(
        new Error(
          `Unsupported type: ${file.mimetype}. Use JPEG, PNG, GIF, or WebP.`,
        ),
      );
};

const storage = multer.memoryStorage();
const opts = { storage, fileFilter, limits: { fileSize: MAX_SIZE } };

export const uploadSingle = multer(opts).single("image");
export const uploadMultiple = multer({
  ...opts,
  limits: { ...opts.limits, files: 5 },
}).array("images", 5);
