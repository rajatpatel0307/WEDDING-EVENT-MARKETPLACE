export function captureClientIp(req, res, next) {
  if (req.aborted || req.socket?.destroyed) {
    res.destroy();
    return;
  }

  // Express resolves this getter from the socket on every access. Capture it
  // before asynchronous middleware can outlive the connection's address.
  const ip = req.ip;
  if (!ip) {
    res.status(400).json({ message: "Unable to determine client IP address." });
    return;
  }

  Object.defineProperty(req, "ip", {
    value: ip,
    enumerable: true,
    configurable: true,
  });
  next();
}
