import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { errorHandler } from "../../src/middleware/errorHandler.js";

function makeMocks() {
  const req = {} as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status, json } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next, status, json };
}

describe("errorHandler", () => {
  it("handles multer LIMIT_FILE_SIZE → 413", () => {
    const { req, res, next, status, json } = makeMocks();
    const err = new multer.MulterError("LIMIT_FILE_SIZE");
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "LIMIT_FILE_SIZE",
        message: "Image exceeds 4MB limit. Compress it or use a URL.",
        details: null,
      },
    });
  });

  it("handles multer LIMIT_FILE_COUNT → 400", () => {
    const { req, res, next, status, json } = makeMocks();
    const err = new multer.MulterError("LIMIT_FILE_COUNT");
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "LIMIT_FILE_COUNT",
        message: "Maximum 5 images per request.",
        details: null,
      },
    });
  });

  it("handles multer LIMIT_UNEXPECTED_FILE → 400", () => {
    const { req, res, next, status, json } = makeMocks();
    const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE");
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "LIMIT_UNEXPECTED_FILE",
        message: "Wrong field name. Use 'image' or 'images'.",
        details: null,
      },
    });
  });

  it("handles unsupported file type error → 400", () => {
    const { req, res, next, status, json } = makeMocks();
    const err = new Error("Unsupported type: application/pdf. Use JPEG, PNG, GIF, or WebP.");
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_FILE_TYPE",
        message: err.message,
        details: null,
      },
    });
  });

  it("handles generic Error → 500 INTERNAL_ERROR", () => {
    const { req, res, next, status, json } = makeMocks();
    const err = new Error("Something broke");
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something broke",
        details: null,
      },
    });
  });

  it("handles non-Error object with custom status", () => {
    const { req, res, next, status, json } = makeMocks();
    const err = { status: 403, message: "Forbidden" };
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(403);
  });

  it("all error responses include details field", () => {
    const { req, res, next, json } = makeMocks();
    errorHandler(new Error("test"), req, res, next);
    const payload = json.mock.calls[0][0];
    expect(payload.error).toHaveProperty("details");
  });
});
