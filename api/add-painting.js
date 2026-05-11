import { kv } from "@vercel/kv";
import { verifyAdmin } from "./_verifyAdmin";
import { sanitizeString } from "./_sanitize";

function isValidString(str) {
  return typeof str === "string" &&
         str.trim().length > 0 &&
         !/[<>]/.test(str);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, medium, price, sold, imgData } = req.body;

  if (!isValidString(title) ||
      !isValidString(medium) ||
      typeof price !== "number" ||
      price < 0) {
    return res.status(400).json({ success: false, error: "Invalid artwork data" });
  }

  try {
    let artworks = await kv.get("artworks") || [];

    const id = Date.now();

    artworks.push({
      id,
      title: sanitizeString(title),
      medium: sanitizeString(medium),
      price,
      sold,
      imgData,
      svg: null
    });

    await kv.set("artworks", artworks);

    return res.status(200).json({ success: true, id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
}
