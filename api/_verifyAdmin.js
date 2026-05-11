import jwt from "jsonwebtoken";
import { sanitizeString } from "./_sanitize";

export function verifyAdmin(req) {
  try {
    const safeTitle = sanitizeString(title);
    const safeMedium = sanitizeString(medium);
    const header = req.headers.authorization;
    if (!header) return false;

    const token = header.replace("Bearer ", "");
    const secret = process.env.ADMIN_JWT_SECRET;

    const decoded = jwt.verify(token, secret);
    return decoded.role === "admin";
  } catch {
    return false;
  }
}
