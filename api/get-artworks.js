import { kv } from "@vercel/kv";
import { sanitizeString } from "./_sanitize";

const safeTitle = sanitizeString(title);
const safeMedium = sanitizeString(medium);

export default async function handler(req, res) {
  try {
    let artworks = await kv.get("artworks");

    if (!artworks) {
      artworks = [];
      await kv.set("artworks", artworks);
    }

    return res.status(200).json({ artworks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ artworks: [] });
  }
}
