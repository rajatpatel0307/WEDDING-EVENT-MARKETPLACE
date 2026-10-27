import bcrypt from "bcrypt";
import { password } from "./auth.validation.js";
export const hashPassword = (value) => bcrypt.hash(password.parse(value), 12);
export const verifyPassword = (value, hash) => bcrypt.compare(value, hash);
