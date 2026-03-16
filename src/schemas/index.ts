import { z } from "zod";

// ── Content block schema (vision support) ────────────────────────────────────

const ContentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("image_url"),
    image_url: z.object({ url: z.string().url() }),
  }),
]);

// ── Chat request body ────────────────────────────────────────────────────────

export const ChatBodySchema = z
  .object({
    message: z.string().optional(),
    content: z.array(ContentBlockSchema).optional(),
    sessionId: z.string().optional(),
    model: z.string().optional(),
    system: z.string().optional(),
  })
  .refine((data) => data.message || data.content, {
    message: "Either 'message' or 'content' must be provided",
  });

// ── Upload request body (multipart text fields) ──────────────────────────────

export const UploadBodySchema = z.object({
  message: z.string().min(1, "The 'message' field is required"),
  sessionId: z.string().optional(),
  system: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────────

export type ChatBody = z.infer<typeof ChatBodySchema>;
export type UploadBody = z.infer<typeof UploadBodySchema>;
