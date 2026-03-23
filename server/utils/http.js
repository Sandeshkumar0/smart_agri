export const apiResponse = (res, status, data) => {
  res.status(status).json(data);
};

export const apiError = (res, status, message) => {
  res.status(status).json({ message });
};

export const withFallback = (
  handler,
  {
    status = 200,
    message = "Fallback response",
    fallbackData = {},
    fallbackFactory = null,
  } = {}
) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    const data =
      typeof fallbackFactory === "function"
        ? fallbackFactory(req, error)
        : fallbackData;

    return apiResponse(res, status, {
      ...data,
      _fallback: true,
      _message: message,
      _error: error?.message || "unknown error",
    });
  }
};
