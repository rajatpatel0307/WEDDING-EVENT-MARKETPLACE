import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { createServer } from "node:http";
import { typeDefs, resolvers } from "./graphql/index.js";
import { authenticate } from "./modules/auth/token.service.js";
import { production } from "./config/environment.js";
import { limit } from "./modules/auth/security.service.js";
import { securityValidation } from "./graphql/security.validation.js";
export async function createApp() {
  const app = express(),
    httpServer = createServer(app);
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY_HOPS)
    app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
  app.use(
    helmet(),
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    }),
    cookieParser(),
  );
  app.get("/api/health", (_, res) =>
    res.json({ success: true, message: "Wedding marketplace API" }),
  );
  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: true,
    allowBatchedHttpRequests: false,
    introspection: !production,
    includeStacktraceInErrorResponses: false,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    validationRules: [securityValidation],
    formatError: (formatted, error) => {
      if (error.originalError?.name === "ZodError")
        return {
          message:
            "Please check your entries. Passwords need 8–72 characters, uppercase, lowercase, a number and a special character.",
          extensions: { code: "BAD_USER_INPUT" },
        };
      if (error.originalError?.name === "SequelizeUniqueConstraintError")
        return {
          message: "These details are already registered.",
          extensions: { code: "BAD_USER_INPUT" },
        };
      if (formatted.extensions?.code === "INTERNAL_SERVER_ERROR")
        return {
          message: "Unable to complete the request. Please try again.",
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        };
      return formatted;
    },
  });
  await apollo.start();
  app.use(
    "/graphql",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    express.json({ limit: "8mb" }),
    async (req, res, next) => {
      if (
        req.headers.origin &&
        req.headers.origin !==
          (process.env.FRONTEND_URL || "http://localhost:5173")
      )
        return res
          .status(403)
          .json({ errors: [{ message: "Origin not allowed." }] });
      if (req.method !== "POST")
        return res
          .status(405)
          .json({ errors: [{ message: "Use POST for GraphQL." }] });
      try {
        await limit(`graphql:${req.ip}`, 300, 60);
        next();
      } catch {
        res.status(429).json({
          errors: [{ message: "Too many requests. Please try later." }],
        });
      }
    },
    expressMiddleware(apollo, {
      context: async ({ req, res }) => ({
        req,
        res,
        auth: await authenticate(req),
      }),
    }),
  );
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({
      message:
        err.type === "entity.too.large"
          ? "File too large."
          : "Unable to process request.",
    });
  });
  return { app, httpServer, apollo };
}
