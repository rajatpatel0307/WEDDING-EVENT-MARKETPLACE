export function mediaError(error, res) {
  const code = error.extensions?.code;
  const status =
    error.name === "ZodError"
      ? 400
      : code === "UNAUTHENTICATED"
        ? 401
        : code === "FORBIDDEN"
          ? 403
          : code === "UPLOAD_FAILED"
            ? 502
            : error.name === "SequelizeUniqueConstraintError"
              ? 409
              : error.status || 500;
  res.status(status).json({
    success: false,
    message:
      status >= 500
        ? status === 502
          ? "Cloudinary could not process this image. Retry the upload."
          : "Media service unavailable."
        : error.type === "entity.too.large"
          ? "Upload request is too large."
          : error.name === "ZodError"
            ? error.issues.map((x) => x.message).join(" ")
            : error.message,
  });
}
