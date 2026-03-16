import sharp from "sharp";

/** ~3.7 MB after base64 encoding — safely under Groq's 4 MB cap */
const SAFE_RAW_LIMIT = 2.8 * 1024 * 1024;

/** Compress a single file buffer if it exceeds the safe base64 limit. */
export async function compressIfNeeded(
  file: Express.Multer.File,
): Promise<Express.Multer.File> {
  if (file.buffer.length <= SAFE_RAW_LIMIT) return file;

  const buffer = await sharp(file.buffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();

  return { ...file, buffer, mimetype: "image/jpeg" };
}

/** Compress all files in an array (parallel). */
export async function compressAll(
  files: Express.Multer.File[],
): Promise<Express.Multer.File[]> {
  return Promise.all(files.map(compressIfNeeded));
}
