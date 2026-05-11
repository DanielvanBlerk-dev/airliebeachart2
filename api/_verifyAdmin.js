import jwt from "jsonwebtoken";

export function verifyAdmin(req) {
  try {
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