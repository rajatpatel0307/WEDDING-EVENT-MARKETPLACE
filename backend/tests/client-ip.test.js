import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { captureClientIp } from "../src/middleware/client-ip.middleware.js";

async function serve(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return (headers = {}) =>
    fetch(`http://127.0.0.1:${server.address().port}/`, {
      headers: { Connection: "close", ...headers },
    });
}

test("rate limiting retains the client IP when the socket loses its address during an await", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const app = express();
  app.use(captureClientIp);
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 1,
      skip: async (req) => {
        await Promise.resolve();
        // Model the socket losing its remote address after disconnection.
        Object.defineProperty(req.socket, "remoteAddress", {
          value: undefined,
        });
        return false;
      },
    }),
  );
  app.get("/", (req, res) => res.json({ ip: req.ip, key: req.rateLimit.key }));
  const request = await serve(t, app);
  const response = await request();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ip: "127.0.0.1",
    key: "127.0.0.1",
  });
  assert.equal((await request()).status, 429);
  assert.equal(errors.mock.callCount(), 0);
});

test("captured addresses obey Express proxy trust and ignore untrusted forwarded headers", async (t) => {
  for (const trusted of [false, "loopback"]) {
    const app = express();
    app.set("trust proxy", trusted);
    app.use(captureClientIp);
    app.get("/", (req, res) => res.json({ ip: req.ip }));
    const request = await serve(t, app);
    const response = await request({ "X-Forwarded-For": "203.0.113.8" });
    assert.deepEqual(await response.json(), {
      ip: trusted ? "203.0.113.8" : "127.0.0.1",
    });
  }
});

test("captured IPv6 addresses retain subnet rate limiting and separate client networks", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const app = express();
  app.set("trust proxy", "loopback");
  app.use(captureClientIp);
  app.use(rateLimit({ windowMs: 60000, limit: 1 }));
  app.get("/", (req, res) => res.sendStatus(200));
  const request = await serve(t, app);
  assert.equal(
    (await request({ "X-Forwarded-For": "2001:db8:1234:5600::1" })).status,
    200,
  );
  assert.equal(
    (await request({ "X-Forwarded-For": "2001:db8:1234:56ff::2" })).status,
    429,
  );
  assert.equal(
    (await request({ "X-Forwarded-For": "2001:db8:abcd::1" })).status,
    200,
  );
  assert.equal(errors.mock.callCount(), 0);
});

test("requests without an IP are rejected before the rate limiter, even with a forged header", async (t) => {
  const app = express();
  app.use((req, res, next) => {
    Object.defineProperty(req.socket, "remoteAddress", { value: undefined });
    next();
  });
  app.use(captureClientIp);
  const reachedLimiter = t.mock.fn();
  app.use(reachedLimiter);
  const request = await serve(t, app);
  const response = await request({ "X-Forwarded-For": "203.0.113.8" });
  assert.equal(response.status, 400);
  assert.equal(reachedLimiter.mock.callCount(), 0);
});

test("already disconnected requests stop before accessing the IP or rate limiter", () => {
  for (const req of [{ aborted: true }, { socket: { destroyed: true } }]) {
    Object.defineProperty(req, "ip", {
      get() {
        throw Error("IP accessed after disconnect");
      },
    });
    let destroyed = false;
    captureClientIp(
      req,
      {
        destroy() {
          destroyed = true;
        },
      },
      () => {
        assert.fail("Disconnected request continued");
      },
    );
    assert.equal(destroyed, true);
  }
});
