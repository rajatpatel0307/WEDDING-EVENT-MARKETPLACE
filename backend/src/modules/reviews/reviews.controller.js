export const errorResponse = (error, res) => {
  const code = error.extensions?.code;
  const status =
    error.name === "ZodError" || code === "UPLOAD_FAILED"
      ? 400
      : code === "UNAUTHENTICATED"
        ? 401
        : code === "FORBIDDEN"
          ? 403
          : error.name === "SequelizeUniqueConstraintError"
            ? 409
            : error.status || 500;
  return res.status(status).json({
    success: false,
    message:
      status < 500
        ? error.type === "entity.too.large"
          ? "Review upload is too large. Choose up to five images under 2 MB each."
          : error.type === "entity.parse.failed"
            ? "Send valid JSON."
            : error.name === "ZodError"
              ? error.issues
                  .map(
                    (issue) =>
                      `${issue.path.join(".") || "Review"}: ${issue.message}`,
                  )
                  .join(" ")
              : error.name === "SequelizeUniqueConstraintError"
                ? "This review or active report already exists."
                : error.message
        : "Unable to process the review request.",
  });
};
