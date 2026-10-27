import jwt from "jsonwebtoken";
import { required } from "./environment.js";
export const sign = (payload, expiresIn) =>
  jwt.sign(payload, required("JWT_SECRET"), {
    algorithm: "HS256",
    issuer: "marrynest",
    audience: "marrynest-web",
    expiresIn,
  });
export const verify = (token) =>
  jwt.verify(token, required("JWT_SECRET"), {
    algorithms: ["HS256"],
    issuer: "marrynest",
    audience: "marrynest-web",
  });
