import type { Request, Response, NextFunction } from "express";
import { compressIfNeeded, compressAll } from "@middleware";
import { processChatRequest } from "@services";
import type { UploadBody } from "@schemas";
import type { ContentBlock } from "@types";

const VISION = "meta-llama/llama-4-scout-17b-16e-instruct";

const toUri = (f: Express.Multer.File) =>
  `data:${f.mimetype};base64,${f.buffer.toString("base64")}`;

export async function uploadSingleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        error: {
          code: "MISSING_FILE",
          message: "Attach an image to the 'image' field.",
        },
      });
      return;
    }

    const body = req.body as UploadBody;
    const f = await compressIfNeeded(req.file);
    const content: ContentBlock[] = [
      { type: "text", text: body.message },
      { type: "image_url", image_url: { url: toUri(f) } },
    ];

    res.json(await processChatRequest({ ...body, content, model: VISION }));
  } catch (err) {
    next(err);
  }
}

export async function uploadMultipleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files?.length) {
      res.status(400).json({
        error: {
          code: "MISSING_FILES",
          message: "Attach images to the 'images' field.",
        },
      });
      return;
    }

    const body = req.body as UploadBody;
    const processed = await compressAll(files);
    const content: ContentBlock[] = [
      { type: "text", text: body.message },
      ...processed.map((f) => ({
        type: "image_url" as const,
        image_url: { url: toUri(f) },
      })),
    ];

    const result = await processChatRequest({
      ...body,
      content,
      model: VISION,
    });
    res.json({ ...result, imagesProcessed: processed.length });
  } catch (err) {
    next(err);
  }
}
